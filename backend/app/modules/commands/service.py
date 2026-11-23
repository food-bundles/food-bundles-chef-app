"""Commands service (Phase 9, spec screens 05–08).

Stock movements follow docs/domain-rules.md: accepting a command (or recording it straight to
Cooking) takes its recipe out of stock; declining takes nothing; cancelling an accepted
command puts the ingredients back. Inventory entries hold absolute stock levels, so each
movement writes the new level (entry_type command_use / command_return).
"""

from __future__ import annotations

import uuid
from collections import defaultdict
from decimal import Decimal

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.domain import commands as rules
from app.domain.calculations import convert_quantity, portion_usage
from app.modules.chefs.models import Chef
from app.modules.commands.models import Command, CommandLine, CommandShortage, KitchenStaff
from app.modules.commands.schemas import (
    AcceptRequest,
    CommandCounts,
    CommandCreateRequest,
    CommandResponse,
    CommandsTodayResponse,
    DeclineRequest,
    DishToday,
    MissingResponse,
    StaffCreateRequest,
    StaffUpdateRequest,
    StockCheckResponse,
)
from app.modules.inventory.models import InventoryEntry
from app.modules.inventory.repository import InventoryRepository
from app.modules.kitchens.models import Kitchen
from app.modules.menus.models import MenuItem
from app.modules.recipes.repository import RecipeRepository
from app.shared.kitchen_time import kitchen_today

logger = structlog.get_logger(__name__)

_ZERO = Decimal("0")
COMMAND_USE = "command_use"
COMMAND_RETURN = "command_return"


class CommandService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._recipes = RecipeRepository(db)
        self._inventory = InventoryRepository(db)

    # ── staff ──────────────────────────────────────────────────────────────────

    async def list_staff(self, kitchen: Kitchen) -> list[KitchenStaff]:
        result = await self._db.execute(
            select(KitchenStaff)
            .where(KitchenStaff.kitchen_id == kitchen.id, KitchenStaff.is_active.is_(True))
            .order_by(KitchenStaff.name)
        )
        return list(result.scalars().all())

    async def create_staff(self, kitchen: Kitchen, data: StaffCreateRequest) -> KitchenStaff:
        staff = KitchenStaff(kitchen_id=kitchen.id, name=data.name.strip(), role=data.role)
        self._db.add(staff)
        await self._db.flush()
        return staff

    async def update_staff(
        self, kitchen: Kitchen, staff_id: uuid.UUID, data: StaffUpdateRequest
    ) -> KitchenStaff:
        staff = await self._staff(kitchen, staff_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(staff, key, value.strip() if isinstance(value, str) else value)
        await self._db.flush()
        return staff

    async def _staff(self, kitchen: Kitchen, staff_id: uuid.UUID) -> KitchenStaff:
        staff = await self._db.get(KitchenStaff, staff_id)
        if staff is None or staff.kitchen_id != kitchen.id:
            raise NotFoundError("Staff member not found in this kitchen.")
        return staff

    # ── reading ────────────────────────────────────────────────────────────────

    async def today(self, kitchen: Kitchen) -> CommandsTodayResponse:
        day = kitchen_today(kitchen)
        commands = await self._commands_on(kitchen, day)
        items = await self._menu_items(kitchen)
        stock = await self._stock_for(kitchen, items)
        recipes = {item.id: await self._recipe(item.id) for item in items}

        excluded = set(settings.ORDERED_TODAY_EXCLUDES)
        ordered: dict[uuid.UUID, int] = defaultdict(int)
        counts = CommandCounts()
        for c in commands:
            if c.status in (rules.SERVED, rules.HANDED):
                counts.served += 1
            elif c.status in (rules.NEW, rules.COOKING, rules.CANCELLED, rules.DECLINED):
                setattr(counts, c.status, getattr(counts, c.status) + 1)
            if c.status in excluded:
                continue
            for line in c.lines:
                ordered[line.menu_item_id] += (
                    line.accepted_qty if line.accepted_qty is not None else line.qty
                )

        stock_by_id = {str(k): v for k, v in stock.items()}
        dishes = [
            DishToday(
                menu_item_id=item.id,
                name=item.name,
                category=item.category,
                selling_price=item.selling_price,
                currency=item.selling_price_currency,
                is_active=item.is_active,
                ordered_today=ordered.get(item.id, 0),
                can_make=rules.can_make(recipes[item.id], stock_by_id),
            )
            for item in items
        ]
        out = []
        for c in commands:
            check = None
            if c.status == rules.NEW:
                check = self._check(c, recipes, stock_by_id)
            out.append(_response(c, check))
        return CommandsTodayResponse(
            service_date=day,
            opening_time=kitchen.opening_time.strftime("%H:%M"),
            next_number=await self._next_number(kitchen, day),
            counts=counts,
            commands=out,
            dishes=dishes,
        )

    async def get(self, kitchen: Kitchen, command_id: uuid.UUID) -> CommandResponse:
        command = await self._command(kitchen, command_id)
        check = None
        if command.status == rules.NEW:
            items = await self._menu_items(kitchen)
            recipes = {item.id: await self._recipe(item.id) for item in items}
            stock = {str(k): v for k, v in (await self._stock_for(kitchen, items)).items()}
            check = self._check(command, recipes, stock)
        return _response(command, check)

    # ── writing ────────────────────────────────────────────────────────────────

    async def create(self, kitchen: Kitchen, chef: Chef, data: CommandCreateRequest) -> CommandResponse:
        if data.id is not None:
            existing = await self._db.get(Command, data.id)
            if existing is not None:
                if existing.kitchen_id != kitchen.id:
                    raise ConflictError("Command id already used.")
                return _response(existing, None)  # same command sent twice (offline retry)

        if data.staff_id is not None:
            staff = await self._staff(kitchen, data.staff_id)
            name, role = staff.name, staff.role
        else:
            name, role = chef.name or "Chef", "chef"
        if role not in settings.COMMAND_RECORDER_ROLES:
            raise ValidationError(f"A {role} cannot record commands in this kitchen.")
        if data.type == rules.DINE_IN and not (data.table_no or "").strip():
            data = data.model_copy(update={"table_no": None})

        items = {item.id: item for item in await self._menu_items(kitchen)}
        lines: list[CommandLine] = []
        for req in data.lines:
            item = items.get(req.menu_item_id)
            if item is None:
                raise NotFoundError("Dish not found in this kitchen's menu.")
            if not item.is_active:
                raise ConflictError(f"{item.name} is switched off on today's menu.")
            lines.append(
                CommandLine(
                    menu_item_id=item.id,
                    dish_name=item.name,
                    qty=req.qty,
                    unit_price=item.selling_price,
                    unit_price_currency=item.selling_price_currency or kitchen.currency,
                )
            )

        day = kitchen_today(kitchen)
        status = rules.initial_status(role, settings.COMMAND_NEW_STATUS_ROLES)
        command = Command(
            id=data.id or uuid.uuid4(),
            kitchen_id=kitchen.id,
            service_date=day,
            number=await self._next_number(kitchen, day),
            type=data.type,
            table_no=(data.table_no or None) if data.type == rules.DINE_IN else None,
            recorded_by_staff_id=data.staff_id,
            recorded_by_name=name,
            recorded_by_role=role,
            status=status,
            lines=lines,
        )
        self._db.add(command)
        await self._db.flush()
        if status == rules.COOKING:
            await self._after_accept(kitchen, chef, command)
        await self._db.flush()
        return _response(command, None)

    async def accept(
        self, kitchen: Kitchen, chef: Chef, command_id: uuid.UUID, data: AcceptRequest
    ) -> CommandResponse:
        command = await self._command(kitchen, command_id)
        if command.status == rules.COOKING:
            return _response(command, None)  # already accepted (retry)
        self._require(command, rules.COOKING)
        partial = data.portions or {}
        for line in command.lines:
            if line.id in partial:
                taken = partial[line.id]
                if taken < 0 or taken > line.qty:
                    raise ValidationError("Accepted portions must be between 0 and the ordered quantity.")
                line.accepted_qty = taken
            else:
                line.accepted_qty = line.qty
        if all((line.accepted_qty or 0) == 0 for line in command.lines):
            raise ValidationError("Accept at least one portion, or decline the command.")
        command.status = rules.COOKING
        await self._after_accept(kitchen, chef, command)
        await self._db.flush()
        return _response(command, None)

    async def decline(
        self, kitchen: Kitchen, command_id: uuid.UUID, data: DeclineRequest
    ) -> CommandResponse:
        command = await self._command(kitchen, command_id)
        if command.status == rules.DECLINED:
            return _response(command, None)
        self._require(command, rules.DECLINED)
        items = await self._menu_items(kitchen)
        recipes = {item.id: await self._recipe(item.id) for item in items}
        stock = {str(k): v for k, v in (await self._stock_for(kitchen, items)).items()}
        check = self._check(command, recipes, stock)
        command.status = rules.DECLINED
        command.decline_message = check.decline_message
        for m in check.missing:
            self._db.add(
                CommandShortage(
                    kitchen_id=kitchen.id,
                    command_id=command.id,
                    ingredient_id=m.ingredient_id,
                    service_date=command.service_date,
                    short_qty=m.short,
                    add_to_requisition=data.add_to_requisition,
                )
            )
        await self._db.flush()
        return _response(command, None)

    async def serve(self, kitchen: Kitchen, chef: Chef, command_id: uuid.UUID) -> CommandResponse:
        command = await self._command(kitchen, command_id)
        target = rules.done_status(command.type)
        if command.status == target:
            return _response(command, None)
        self._require(command, target)
        command.status = target
        if settings.COMMAND_DEDUCT_ON == "served" and not command.stock_deducted:
            await self._move_stock(kitchen, chef, command, sign=-1)
        await self._db.flush()
        return _response(command, None)

    async def cancel(self, kitchen: Kitchen, chef: Chef, command_id: uuid.UUID) -> CommandResponse:
        command = await self._command(kitchen, command_id)
        if command.status == rules.CANCELLED:
            return _response(command, None)
        self._require(command, rules.CANCELLED)
        command.status = rules.CANCELLED
        if command.stock_deducted:
            await self._move_stock(kitchen, chef, command, sign=+1)
        await self._db.flush()
        return _response(command, None)

    # ── helpers ────────────────────────────────────────────────────────────────

    async def _after_accept(self, kitchen: Kitchen, chef: Chef, command: Command) -> None:
        for line in command.lines:
            if line.accepted_qty is None:
                line.accepted_qty = line.qty
        if settings.COMMAND_DEDUCT_ON == "accept":
            await self._move_stock(kitchen, chef, command, sign=-1)
        if not settings.COMMAND_KEEP_COOKING_STEP:
            command.status = rules.done_status(command.type)

    async def _move_stock(self, kitchen: Kitchen, chef: Chef, command: Command, sign: int) -> None:
        """sign −1: take the accepted portions' recipes out; +1: put them back."""
        use: dict[uuid.UUID, Decimal] = defaultdict(lambda: _ZERO)
        for line in command.lines:
            portions = Decimal(line.accepted_qty if line.accepted_qty is not None else line.qty)
            for need in await self._recipe(line.menu_item_id):
                use[uuid.UUID(need.ingredient_id)] += need.qty_per_portion * portions
        for ingredient_id, qty in use.items():
            current = await self._inventory.current_stock(kitchen.id, ingredient_id)
            new = max(current + sign * qty, _ZERO)
            self._db.add(
                InventoryEntry(
                    kitchen_id=kitchen.id,
                    ingredient_id=ingredient_id,
                    quantity=new,
                    entry_type=COMMAND_USE if sign < 0 else COMMAND_RETURN,
                    notes=f"Command #{command.number:03d} ({command.id})",
                    recorded_by=chef.id,
                )
            )
            await self._db.flush()
        command.stock_deducted = sign < 0

    def _check(
        self,
        command: Command,
        recipes: dict[uuid.UUID, list[rules.RecipeNeed]],
        stock: dict[str, Decimal],
    ) -> StockCheckResponse:
        check = rules.stock_check(
            [(line.qty, recipes.get(line.menu_item_id, [])) for line in command.lines], stock
        )
        return StockCheckResponse(
            enough=check.enough,
            missing=[
                MissingResponse(
                    ingredient_id=uuid.UUID(m.ingredient_id),
                    name=m.name,
                    unit=m.unit,
                    need=m.need,
                    have=m.have,
                    short=m.short,
                )
                for m in check.missing
            ],
            max_portions=check.max_portions,
            total_portions=check.total_portions,
            decline_message=rules.decline_message(check.missing) if check.missing else None,
        )

    async def _recipe(self, menu_item_id: uuid.UUID) -> list[rules.RecipeNeed]:
        needs = []
        for line in await self._recipes.list_for_item(menu_item_id):
            ing = line.ingredient
            qty = convert_quantity(line.qty_per_portion, line.unit, ing.unit)
            if qty is None:
                logger.warning("command_recipe_unit_mismatch", ingredient_id=str(ing.id))
                continue
            yld = line.yield_fraction_override or ing.yield_fraction
            needs.append(
                rules.RecipeNeed(
                    ingredient_id=str(ing.id),
                    name=ing.name,
                    unit=ing.unit,
                    qty_per_portion=portion_usage(Decimal("1"), qty, yld),
                )
            )
        return needs

    async def _stock_for(self, kitchen: Kitchen, items: list[MenuItem]) -> dict[uuid.UUID, Decimal]:
        stock: dict[uuid.UUID, Decimal] = {}
        for item in items:
            for line in await self._recipes.list_for_item(item.id):
                if line.ingredient_id not in stock:
                    stock[line.ingredient_id] = await self._inventory.current_stock(
                        kitchen.id, line.ingredient_id
                    )
        return stock

    async def _menu_items(self, kitchen: Kitchen) -> list[MenuItem]:
        result = await self._db.execute(
            select(MenuItem).where(MenuItem.kitchen_id == kitchen.id).order_by(MenuItem.name)
        )
        return list(result.scalars().all())

    async def _commands_on(self, kitchen: Kitchen, day: object) -> list[Command]:
        result = await self._db.execute(
            select(Command)
            .where(Command.kitchen_id == kitchen.id, Command.service_date == day)
            .order_by(Command.number)
        )
        return list(result.scalars().all())

    async def _command(self, kitchen: Kitchen, command_id: uuid.UUID) -> Command:
        command = await self._db.get(Command, command_id)
        if command is None or command.kitchen_id != kitchen.id:
            raise NotFoundError("Command not found in this kitchen.")
        return command

    async def _next_number(self, kitchen: Kitchen, day: object) -> int:
        query = select(func.max(Command.number)).where(Command.kitchen_id == kitchen.id)
        if settings.COMMAND_NUMBER_RESET == "each_opening":
            query = query.where(Command.service_date == day)
        current = (await self._db.execute(query)).scalar()
        return int(current or 0) + 1

    def _require(self, command: Command, target: str) -> None:
        if not rules.can_transition(command.status, target, command.type):
            raise ConflictError(f"A {command.status} command cannot become {target}.")


def _response(command: Command, check: StockCheckResponse | None) -> CommandResponse:
    response = CommandResponse.model_validate(command)
    response.stock_check = check
    return response
