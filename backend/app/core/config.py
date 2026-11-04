from __future__ import annotations

from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_NAME: str = "Food Bundles Chef API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    DATABASE_URL: str
    DATABASE_URL_SYNC: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: list[str] = []

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v

    # OTP
    OTP_PROVIDER: Literal["mock", "pindo", "africas_talking", "twilio"] = "mock"
    OTP_EXPIRY_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60

    # SMS
    SMS_API_KEY: str = ""
    SMS_SENDER_ID: str = "FoodBundles"

    # Meta Model API
    META_MODEL_API_BASE_URL: str = "https://api.meta.ai/v1"
    MODEL_API_KEY: str = ""
    META_MUSE_SPARK_MODEL: str = ""
    META_MUSE_WONDER_MODEL: str = ""
    META_MUSE_IMAGE_MODEL: str = ""
    META_MUSE_VOICE_MODEL: str = ""
    META_SAM_MODEL: str = ""

    # Open-weight models
    MUSE_GLIMMER_BASE_URL: str = ""
    MUSE_GLIMMER_MODEL: str = ""
    MUSE_SPARK_OPEN_BASE_URL: str = ""
    MUSE_SPARK_OPEN_MODEL: str = ""

    # AI controls — all capabilities off by default (AI004)
    AI_ENABLED: bool = False
    AI_AGENT_ENABLED: bool = False
    AI_DEFAULT_TIMEOUT_SECONDS: int = 20
    AI_MAX_RETRIES: int = 1
    AI_MAX_IMAGE_SIZE_BYTES: int = 1_048_576  # 1 MB
    AI_LOG_CONTENT: bool = False  # never log raw media or prompts
    # Per-capability flags — require AI_ENABLED=True AND individual flag=True
    AI_QUALITY_ASSESSMENT_ENABLED: bool = False
    AI_TRANSCRIPTION_ENABLED: bool = False
    # Per-kitchen daily request limits (0 = no limit configured)
    AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY: int = 0

    # Food Bundles catalog
    FOOD_BUNDLES_CATALOG_PROVIDER: Literal["mock", "live"] = "mock"
    FOOD_BUNDLES_API_URL: str = ""
    FOOD_BUNDLES_API_KEY: str = ""

    # Object storage
    OBJECT_STORAGE_PROVIDER: Literal["local", "s3", "gcs", "cloudinary"] = "local"
    OBJECT_STORAGE_BUCKET: str = "food-bundles-chef"
    OBJECT_STORAGE_ACCESS_KEY: str = ""
    OBJECT_STORAGE_SECRET_KEY: str = ""
    OBJECT_STORAGE_ENDPOINT_URL: str = ""
    LOCAL_STORAGE_PATH: str = "./storage"
    # Cloudinary (used when OBJECT_STORAGE_PROVIDER=cloudinary)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Push notifications
    PUSH_NOTIFICATIONS_PROVIDER: Literal["mock", "expo"] = "mock"
    EXPO_ACCESS_TOKEN: str = ""

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()  # type: ignore[call-arg]
