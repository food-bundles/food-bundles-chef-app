from __future__ import annotations

from enum import StrEnum


class KitchenStatus(StrEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class OrderStatus(StrEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    CONFIRMED = "confirmed"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DeliveryStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


# Hyphen preserved to match mobile TypeScript union type exactly.
# Do NOT normalize to underscore without a coordinated mobile PR.
class ReceivingDecision(StrEnum):
    ACCEPTED = "accepted"
    PARTIALLY_ACCEPTED = "partially-accepted"
    REJECTED = "rejected"


class QualityCheckResult(StrEnum):
    PASS = "pass"  # nosec B105 - a quality status, not a password
    WATCH = "watch"
    FAIL = "fail"


class StockMovementReason(StrEnum):
    DELIVERY = "delivery"
    MANUAL_ADJUSTMENT = "manual_adjustment"
    OPENING_COUNT = "opening_count"
    DAILY_USE = "daily_use"
    WASTE = "waste"
    RETURN = "return"


class MutationStatus(StrEnum):
    PENDING = "pending"
    SYNCING = "syncing"  # mobile value — do not change to 'processing'
    FAILED = "failed"
    CONFLICT = "conflict"


class MutationOperationType(StrEnum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


class PriceSource(StrEnum):
    CHEF_ENTERED = "chef-entered"
    REFERENCE = "reference"
    FOOD_BUNDLES_CATALOG = "food-bundles-catalog"


class NotificationChannel(StrEnum):
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"


class AuditEventType(StrEnum):
    AUTH_OTP_REQUESTED = "auth.otp_requested"
    AUTH_OTP_VERIFIED = "auth.otp_verified"
    AUTH_LOGIN = "auth.login"
    AUTH_LOGOUT = "auth.logout"
    AUTH_TOKEN_REFRESHED = "auth.token_refreshed"  # nosec B105 - an audit event name, not a token
    KITCHEN_CREATED = "kitchen.created"
    KITCHEN_UPDATED = "kitchen.updated"
    KITCHEN_ARCHIVED = "kitchen.archived"
    KITCHEN_CURRENCY_CHANGED = "kitchen.currency_changed"
    ORDER_CREATED = "order.created"
    ORDER_CANCELLED = "order.cancelled"
    DELIVERY_STARTED = "delivery.started"
    DELIVERY_COMPLETED = "delivery.completed"
    STOCK_ADJUSTED = "stock.adjusted"
