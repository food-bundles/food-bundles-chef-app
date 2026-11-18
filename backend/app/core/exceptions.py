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
