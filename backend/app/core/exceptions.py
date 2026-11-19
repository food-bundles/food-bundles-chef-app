from __future__ import annotations

from http import HTTPStatus


class AppError(Exception):
    """Base application error. All domain errors inherit from this."""

    status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.__class__.message
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = HTTPStatus.NOT_FOUND
    error_code = "NOT_FOUND"
    message = "The requested resource was not found."


class UnauthorizedError(AppError):
    status_code = HTTPStatus.UNAUTHORIZED
    error_code = "UNAUTHORIZED"
    message = "Authentication is required."


class ForbiddenError(AppError):
    status_code = HTTPStatus.FORBIDDEN
    error_code = "FORBIDDEN"
    message = "You do not have permission to perform this action."


class KitchenAccessDeniedError(ForbiddenError):
    error_code = "KITCHEN_ACCESS_DENIED"
    message = "You do not have permission to access this kitchen."


class ConflictError(AppError):
    status_code = HTTPStatus.CONFLICT
    error_code = "CONFLICT"
    message = "A conflict occurred with the current state of the resource."


class AmountPrecisionError(AppError):
    """An amount has more decimals than its currency allows; it is refused, never rounded."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    error_code = "AMOUNT_PRECISION"
    message = "This amount has more decimal places than the currency allows."


class OtherCurrencyNotSupportedError(ConflictError):
    """Amounts in a currency other than the kitchen's need conversion (exchange rates)."""

    error_code = "OTHER_CURRENCY_NOT_SUPPORTED"
    message = "Amounts must be in the kitchen's currency until currency conversion is available."


class CurrencyChangeNotAllowedError(ConflictError):
    """A kitchen's currency changes only through the convert / relabel flow."""

    error_code = "CURRENCY_CHANGE_REQUIRES_CONFIRMATION"
    message = (
        "Changing the kitchen currency needs the convert or relabel flow, "
        "which shows the effect on prices first."
    )


class UnknownCurrencyCodeError(AppError):
    """A currency code that is not in the ISO 4217 table (or is a fund code)."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    error_code = "UNKNOWN_CURRENCY"
    message = "This is not a currency code the app supports."


class RateUnavailableError(ConflictError):
    """No exchange rate from the rates table within the staleness window: nothing is converted."""

    error_code = "RATE_UNAVAILABLE"
    message = "No recent exchange rate is available for these currencies."


class ConversionDisabledError(AppError):
    """Currency conversion is not offered in this kitchen's country yet (licensed rate source
    pending). Prices in the kitchen's own currency still work."""

    status_code = HTTPStatus.FORBIDDEN
    error_code = "CONVERSION_DISABLED"
    message = "Currency conversion is not available for this kitchen yet."


class RateChangedError(ConflictError):
    """The rate shown in the preview is no longer the current rate; preview again."""

    error_code = "RATE_CHANGED"
    message = (
        "The exchange rate changed since the preview. Check the new preview and confirm again."
    )


class CurrencyConfirmationError(AppError):
    """Relabelling needs the new currency code typed as confirmation."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    error_code = "CONFIRMATION_MISMATCH"
    message = "Type the new currency code to confirm."


class RelabelPrecisionError(ConflictError):
    """Relabelling would need rounding (e.g. 7.99 EUR relabelled as RWF, which has no cents)."""

    error_code = "RELABEL_PRECISION"
    message = (
        "Some prices have more decimals than the new currency allows. Fix them first, "
        "or convert instead."
    )


class CatalogNotAvailableError(ConflictError):
    """Food Bundles catalogue items for a kitchen in a country Food Bundles does not serve."""

    error_code = "CATALOG_NOT_AVAILABLE"
    message = (
        "The Food Bundles catalogue is not available in this kitchen's country. Use manual items."
    )


class OrderOnItsWayError(ConflictError):
    """Cancel refused: the order is already on its way (status out_for_delivery)."""

    error_code = "ORDER_ON_ITS_WAY"
    message = "This order is on its way — contact Food Bundles support."


class ValidationError(AppError):
    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    error_code = "VALIDATION_ERROR"
    message = "The request data is invalid."


class OtpError(AppError):
    status_code = HTTPStatus.BAD_REQUEST
    error_code = "OTP_ERROR"
    message = "OTP verification failed."


class OtpExpiredError(OtpError):
    error_code = "OTP_EXPIRED"
    message = "The OTP has expired."


class OtpMaxAttemptsError(OtpError):
    error_code = "OTP_MAX_ATTEMPTS"
    message = "Too many failed OTP attempts. Please request a new code."


class OtpResendCooldownError(OtpError):
    status_code = HTTPStatus.TOO_MANY_REQUESTS
    error_code = "OTP_RESEND_COOLDOWN"
    message = "Please wait before requesting a new OTP."


class RateLimitError(AppError):
    status_code = HTTPStatus.TOO_MANY_REQUESTS
    error_code = "RATE_LIMIT_EXCEEDED"
    message = "Too many requests. Please slow down."


class IdempotencyConflictError(ConflictError):
    error_code = "IDEMPOTENCY_CONFLICT"
    message = "A different request was already submitted with this operation ID."


class AiProviderError(AppError):
    status_code = HTTPStatus.BAD_GATEWAY
    error_code = "AI_PROVIDER_ERROR"
    message = "The AI provider returned an unexpected response."


class AiDisabledError(AppError):
    status_code = HTTPStatus.SERVICE_UNAVAILABLE
    error_code = "AI_DISABLED"
    message = "AI features are not enabled in this environment."


class AiBadOutputError(AppError):
    """The model answer failed schema validation twice (original + one repair attempt)."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    error_code = "AI_BAD_OUTPUT"
    message = "The AI answer could not be read."


class AiTimeoutError(AppError):
    status_code = HTTPStatus.GATEWAY_TIMEOUT
    error_code = "AI_TIMEOUT"
    message = "The AI took too long to answer."


class AiRateLimitError(RateLimitError):
    error_code = "AI_RATE_LIMITED"
    message = "Daily AI request limit reached."


class AiUnavailableError(AppError):
    """Every configured AI provider failed or is switched off; manual flows still work."""

    status_code = HTTPStatus.SERVICE_UNAVAILABLE
    error_code = "AI_UNAVAILABLE"
    message = "AI is temporarily unavailable."


class AiPrimaryFailedError(AiUnavailableError):
    """The primary failed under a `no_failover` policy, so no other provider was tried.

    Feature services turn this into their own typed result (classify returns
    status="classify_unavailable" and the app asks the chef to pick the photo type).
    """


class AiRefusedError(AppError):
    """The model declined the request. Never retried on another provider."""

    status_code = HTTPStatus.UNPROCESSABLE_ENTITY
    error_code = "AI_REFUSED"
    message = "The AI can't help with that request."


class AiBudgetExceededError(RateLimitError):
    error_code = "AI_BUDGET_EXCEEDED"
    message = "Today's AI budget has been reached."


class AiAudioTooLargeError(AppError):
    status_code = HTTPStatus.REQUEST_ENTITY_TOO_LARGE
    error_code = "AI_AUDIO_TOO_LARGE"
    message = "The voice clip is too long."


class AiImageInvalidError(AppError):
    status_code = HTTPStatus.REQUEST_ENTITY_TOO_LARGE
    error_code = "AI_IMAGE_INVALID"
    message = "The image is missing, too large or not a supported format."
