import type { ActionProposal } from '@/api/agent-api';
import { formatDate, formatQuantity } from '@/lib/format';
import { formatMoney, minorUnits } from '@/lib/money';
import { activeKitchenCurrency, activeKitchenToday } from '@/features/kitchens/kitchen-today';

/**
 * Turns an action proposal into what the action card shows. Everything here is
 * derived from `params` — exactly what will be written on Confirm — never from
 * the model's free-text summary.
 */

/** Minimal i18next `t` signature (keeps this module testable without React). */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface ProposalDetail {
  label: string;
  value: string;
}

export type FieldKind = 'int' | 'decimal' | 'text' | 'choice';

export interface EditableField {
  /** Stable id used as the form key, e.g. "portions_sold" or "lines.0.quantity_ordered". */
  id: string;
  path: (string | number)[];
  label: string;
  kind: FieldKind;
  /** Lower bound for numbers; `minExclusive` makes it strict (> instead of ≥). */
  min?: number;
  minExclusive?: boolean;
  /** Unit shown after a number field. */
  unit?: string;
  options?: { value: string; label: string }[];
}

type Params = Record<string, unknown>;

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asList(value: unknown): Params[] {
  return Array.isArray(value) ? value.filter((v): v is Params => typeof v === 'object' && v !== null) : [];
}

/** Value at `path` inside `params` (undefined when missing). */
export function getAt(params: Params, path: (string | number)[]): unknown {
  let current: unknown = params;
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

/** Copy of `params` with `value` written at `path` (objects and arrays are cloned along the way). */
export function setAt(params: Params, path: (string | number)[], value: unknown): Params {
  const [head, ...rest] = path;
  if (head === undefined) return params;
  const clone: Params | unknown[] = Array.isArray(params) ? [...(params as unknown[])] : { ...params };
  const child = (params as Record<string | number, unknown>)[head];
  const next = rest.length === 0 ? value : setAt((child ?? {}) as Params, rest, value);
  (clone as Record<string | number, unknown>)[head] = next;
  return clone as Params;
}

function orderRef(orderId: unknown): string {
  const id = asText(orderId);
  return id ? `#${id.slice(0, 8).toUpperCase()}` : '#—';
}

function dayLabel(iso: string, t: Translate, lang: string): string {
  if (!iso || iso === activeKitchenToday()) return t('agent.card.today');
  return formatDate(`${iso}T12:00:00`, lang);
}

/** Localised one-line title for the card, built from params. */
/** The currency of a proposed menu price (set by the server), else the kitchen's. */
function priceCurrency(params: Params): string {
  return asText(params.selling_price_currency) || activeKitchenCurrency();
}

/** A menu price in its currency (the server sets selling_price_currency; else the kitchen's). */
function menuPrice(params: Params, lang: string): string {
  return formatMoney(asText(params.selling_price), priceCurrency(params), lang);
}

export function proposalTitle(p: ActionProposal, t: Translate, lang: string): string {
  const params = p.params;
  switch (p.action_type) {
    case 'record_sale':
      return t('agent.card.title.recordSale', {
        portions: formatQuantity(asText(params.portions_sold), lang),
        name: asText(params.menu_item_name),
      });
    case 'record_inventory': {
      const change = asText(params.change);
      const key = change === 'add' ? 'inventoryAdd' : change === 'remove' ? 'inventoryRemove' : 'inventorySet';
      return t(`agent.card.title.${key}`, {
        name: asText(params.ingredient_name),
        quantity: formatQuantity(asText(params.quantity), lang),
        unit: asText(params.unit),
      });
    }
    case 'create_ingredient':
      return t('agent.card.title.createIngredient', { name: asText(params.name), unit: asText(params.unit) });
    case 'add_menu_item':
      return t('agent.card.title.addMenuItem', {
        name: asText(params.name),
        price: menuPrice(params, lang),
      });
    case 'link_recipe_ingredient':
      return t('agent.card.title.linkRecipe', {
        quantity: formatQuantity(asText(params.qty_per_portion), lang),
        unit: asText(params.unit),
        ingredient: asText(params.ingredient_name),
        dish: asText(params.menu_item_name),
      });
    case 'create_order':
      return t('agent.card.title.createOrder', { count: asList(params.lines).length });
    case 'submit_order':
      return t('agent.card.title.submitOrder', { ref: orderRef(params.order_id) });
    case 'cancel_order':
      return t('agent.card.title.cancelOrder', { ref: orderRef(params.order_id) });
    case 'start_delivery':
      return t('agent.card.title.startDelivery', { ref: orderRef(params.order_id) });
    case 'receive_delivery':
      return t('agent.card.title.receiveDelivery', {
        count: asList(params.lines).length,
        ref: orderRef(params.order_id),
      });
    case 'undo':
      return t('agent.card.title.undo', { description: asText(params.description) || p.summary });
  }
}

/** Label/value rows listing exactly what will be written. */
export function proposalDetails(p: ActionProposal, t: Translate, lang: string): ProposalDetail[] {
  const params = p.params;
  const row = (labelKey: string, value: string): ProposalDetail => ({ label: t(labelKey), value: value || '—' });
  switch (p.action_type) {
    case 'record_sale':
      return [
        row('agent.card.dish', asText(params.menu_item_name)),
        row('agent.card.portions', formatQuantity(asText(params.portions_sold), lang)),
        row('agent.card.date', dayLabel(asText(params.date), t, lang)),
      ];
    case 'record_inventory': {
      const change = asText(params.change);
      const rows = [
        row('agent.card.ingredient', asText(params.ingredient_name)),
        row('agent.card.change', t(`agent.card.changeTypes.${change === 'add' || change === 'remove' ? change : 'set'}`)),
        row('agent.card.quantity', `${formatQuantity(asText(params.quantity), lang)} ${asText(params.unit)}`.trim()),
      ];
      const notes = asText(params.notes);
      return notes ? [...rows, row('agent.card.note', notes)] : rows;
    }
    case 'create_ingredient':
      return [row('agent.card.name', asText(params.name)), row('agent.card.unit', asText(params.unit))];
    case 'add_menu_item': {
      const category = asText(params.category);
      return [
        row('agent.card.name', asText(params.name)),
        row('agent.card.price', menuPrice(params, lang)),
        ...(params.original_price
          ? [
              row(
                'agent.card.converted',
                t('clarify.converted', {
                  original: formatMoney(asText(params.original_price), asText(params.original_currency), lang),
                  from: asText(params.original_currency),
                  rate: asText(params.rate),
                  to: asText(params.selling_price_currency),
                  date: params.rate_date ? formatDate(asText(params.rate_date), lang) : '',
                }),
              ),
            ]
          : []),
        row('agent.card.category', category ? t(`menu.categories.${category}`) : ''),
      ];
    }
    case 'link_recipe_ingredient':
      return [
        row('agent.card.dish', asText(params.menu_item_name)),
        row('agent.card.ingredient', asText(params.ingredient_name)),
        row(
          'agent.card.perPortion',
          `${formatQuantity(asText(params.qty_per_portion), lang)} ${asText(params.unit)}`.trim(),
        ),
      ];
    case 'create_order': {
      const lines = asList(params.lines).map((l) => ({
        label: asText(l.product_name) || '—',
        value: `${formatQuantity(asText(l.quantity_ordered), lang)} ${asText(l.unit)}`.trim(),
      }));
      const date = asText(params.delivery_date);
      return date ? [...lines, row('agent.card.deliveryDate', dayLabel(date, t, lang))] : lines;
    }
    case 'submit_order':
    case 'cancel_order':
    case 'start_delivery':
      return [row('agent.card.order', orderRef(params.order_id))];
    case 'receive_delivery':
      return [
        row('agent.card.order', orderRef(params.order_id)),
        ...asList(params.lines).map((l) => {
          const decision = asText(l.decision);
          const decisionKey =
            decision === 'rejected' ? 'rejected' : decision === 'partially-accepted' ? 'partial' : 'accepted';
          return {
            label: asText(l.product_name) || '—',
            value: `${formatQuantity(asText(l.quantity_received), lang)} · ${t(`agent.card.decisions.${decisionKey}`)}`,
          };
        }),
      ];
    case 'undo':
      return [];
  }
}

/** Fields the chef may correct on the card before confirming. Empty = card has no Edit button. */
export function editableFields(p: ActionProposal, t: Translate): EditableField[] {
  const params = p.params;
  switch (p.action_type) {
    case 'record_sale':
      return [{ id: 'portions_sold', path: ['portions_sold'], label: t('agent.card.portions'), kind: 'int', min: 1 }];
    case 'record_inventory':
      return [
        {
          id: 'change',
          path: ['change'],
          label: t('agent.card.change'),
          kind: 'choice',
          options: (['set', 'add', 'remove'] as const).map((value) => ({
            value,
            label: t(`agent.card.changeTypes.${value}`),
          })),
        },
        {
          id: 'quantity',
          path: ['quantity'],
          label: t('agent.card.quantity'),
          kind: 'decimal',
          min: 0,
          unit: asText(params.unit),
        },
      ];
    case 'create_ingredient':
      return [
        { id: 'name', path: ['name'], label: t('agent.card.name'), kind: 'text' },
        { id: 'unit', path: ['unit'], label: t('agent.card.unit'), kind: 'text' },
      ];
    case 'add_menu_item':
      return [
        { id: 'name', path: ['name'], label: t('agent.card.name'), kind: 'text' },
        {
          id: 'selling_price',
          path: ['selling_price'],
          label: t('agent.card.price'),
          // Whole numbers for RWF, decimals for EUR, USD, ...
          kind: minorUnits(priceCurrency(params)) === 0 ? 'int' : 'decimal',
          min: 0,
          unit: priceCurrency(params),
        },
      ];
    case 'link_recipe_ingredient':
      return [
        {
          id: 'qty_per_portion',
          path: ['qty_per_portion'],
          label: t('agent.card.perPortion'),
          kind: 'decimal',
          min: 0,
          minExclusive: true,
          unit: asText(params.unit),
        },
      ];
    case 'create_order':
      return asList(params.lines).map((l, i) => ({
        id: `lines.${i}.quantity_ordered`,
        path: ['lines', i, 'quantity_ordered'],
        label: asText(l.product_name) || t('agent.card.quantity'),
        kind: 'decimal' as const,
        min: 0,
        minExclusive: true,
        unit: asText(l.unit),
      }));
    case 'receive_delivery':
      return asList(params.lines).map((l, i) => ({
        id: `lines.${i}.quantity_received`,
        path: ['lines', i, 'quantity_received'],
        label: asText(l.product_name) || t('agent.card.quantity'),
        kind: 'decimal' as const,
        min: 0,
      }));
    case 'submit_order':
    case 'cancel_order':
    case 'start_delivery':
    case 'undo':
      return [];
  }
}

/** Current value of a field as an editable string. */
export function fieldValue(p: ActionProposal, field: EditableField): string {
  return asText(getAt(p.params, field.path));
}

/** i18n key of the validation error for `raw`, or null when valid. Accepts "0,25" as 0.25. */
export function validateField(field: EditableField, raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'agent.card.errors.required';
  if (field.kind === 'text') return value.length > 200 ? 'agent.card.errors.tooLong' : null;
  if (field.kind === 'choice') return field.options?.some((o) => o.value === value) ? null : 'agent.card.errors.required';
  const normalised = value.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalised)) return 'agent.card.errors.number';
  const n = Number(normalised);
  if (field.kind === 'int' && !Number.isInteger(n)) return 'agent.card.errors.wholeNumber';
  if (field.min !== undefined && (field.minExclusive ? n <= field.min : n < field.min)) {
    return field.minExclusive ? 'agent.card.errors.positive' : 'agent.card.errors.min';
  }
  return null;
}

/**
 * Proposal with the edited values written into params (numbers normalised, "0,25" → "0.25").
 * Call only after every field passed `validateField`.
 */
export function applyEdits(p: ActionProposal, fields: EditableField[], values: Record<string, string>): ActionProposal {
  let params = p.params;
  for (const field of fields) {
    const raw = values[field.id];
    if (raw === undefined) continue;
    const trimmed = raw.trim();
    const value =
      field.kind === 'int'
        ? Number(trimmed.replace(',', '.'))
        : field.kind === 'decimal'
          ? trimmed.replace(',', '.')
          : trimmed;
    params = setAt(params, field.path, value);
  }
  return { ...p, params };
}
