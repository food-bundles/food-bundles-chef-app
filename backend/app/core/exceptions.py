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
