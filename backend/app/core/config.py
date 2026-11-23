from __future__ import annotations

from typing import Literal

from pydantic import SecretStr, field_validator
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
    SECRET_KEY: SecretStr
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Database
    # Secret: the URLs carry the database password. Read with .get_secret_value().
    DATABASE_URL: SecretStr
    DATABASE_URL_SYNC: SecretStr = SecretStr("")

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: list[str] = []

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            import json

            parsed: list[str] = json.loads(v)
            return parsed
        return v

    # OTP
    OTP_PROVIDER: Literal["mock", "pindo", "africas_talking", "twilio"] = "mock"
    OTP_EXPIRY_SECONDS: int = 300
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60

    # SMS
    SMS_API_KEY: SecretStr = SecretStr("")
    SMS_SENDER_ID: str = "FoodBundles"

    # Meta Model API
    META_MODEL_API_BASE_URL: str = "https://api.meta.ai/v1"
    MODEL_API_KEY: SecretStr = SecretStr("")
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
    # Per-capability flags — require AI_ENABLED=True AND individual flag=True.
    # Flipping one off (and restarting) is the kill switch; the mobile app reads
    # GET /kitchens/{id}/ai/features and falls back to manual entry.
    AI_QUALITY_ASSESSMENT_ENABLED: bool = False
    AI_TRANSCRIPTION_ENABLED: bool = False
    AI_IMAGE_CLASSIFY_ENABLED: bool = False
    AI_MENU_SCAN_ENABLED: bool = False
    AI_DISH_ANALYSIS_ENABLED: bool = False
    AI_DOCUMENT_SCAN_ENABLED: bool = False
    # Comma-separated languages whose speech-to-text passed evaluation (e.g. "en,fr").
    # Kinyarwanda stays off until a provider is evaluated for it.
    AI_TRANSCRIPTION_LANGUAGES: str = ""
    # Assistant total budget (seconds) until chat streaming (Phase 8 step 1b) brings
    # the time-to-first-token budget AI_TIMEOUT_CHAT_TTFT_MS into use.
    # Classification/extraction budgets: AI_TIMEOUT_CLASSIFY_MS / AI_TIMEOUT_EXTRACT_MS.
    AI_CHAT_TIMEOUT_SECONDS: int = 30
    # Cheaper model for image classification; falls back to META_MUSE_SPARK_MODEL when empty
    META_MUSE_SPARK_FAST_MODEL: str = ""
    # Dish price suggestion: target food-cost share of the selling price
    AI_TARGET_FOOD_COST_LOW: float = 0.25
    AI_TARGET_FOOD_COST_HIGH: float = 0.35
    # Daily AI request budgets (0 = no limit configured). Both apply: a chef with
    # several kitchens cannot multiply their budget by switching kitchens.
    AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY: int = 0
    AI_MAX_REQUESTS_PER_CHEF_PER_DAY: int = 0

    # ── Phase 9: the Food Bundles UX spec's open decisions (docs/domain-rules.md) ──
    # Each defaults to the spec's proposal; change here, not in code.
    COMMAND_DEDUCT_ON: Literal["accept", "served"] = "accept"
    COMMAND_KEEP_COOKING_STEP: bool = True
    # Commands recorded by these roles wait as New for the chef's stock check and Accept;
    # chef-recorded commands go straight to Cooking.
    COMMAND_NEW_STATUS_ROLES: list[str] = ["waiter", "cashier"]
    COMMAND_RECORDER_ROLES: list[str] = ["chef", "waiter", "cashier"]
    ORDERED_TODAY_EXCLUDES: list[str] = ["cancelled", "declined"]
    COMMAND_NUMBER_RESET: Literal["each_opening", "never"] = "each_opening"
    REQUISITION_SAME_WEEKDAYS: int = 7
    REQUISITION_ROUND_TO_PACK: bool = True
    REQUISITION_SAFETY_BUFFER_PCT: float = 0.0
    REQUISITION_YIELD: float = 1.0
    STOCK_LOW_FACTOR: float = 1.0
    STOCK_VERY_LOW_FACTOR: float = 0.5
    OFFLINE_DURING_SERVICE: bool = True

    # ── Phase 8: provider routing (Anthropic primary, Meta fallback) ──────────
    # Order is config, not code. Speech-to-text stays on Meta (Anthropic has no STT).
    AI_PRIMARY_PROVIDER: Literal["anthropic", "meta"] = "anthropic"
    AI_FALLBACK_PROVIDER: Literal["anthropic", "meta", "none"] = "meta"
    ANTHROPIC_API_KEY: SecretStr = SecretStr("")
    ANTHROPIC_ENABLED: bool = True
    # Step 3 canary (docs/canary-plan.md). Defaults keep today's behaviour (every kitchen,
    # every feature, every country). Outside the canary a request is served by Meta only.
    AI_ANTHROPIC_CANARY_PERCENT: int = 100
    AI_ANTHROPIC_CANARY_FEATURES: list[str] = []
    AI_ANTHROPIC_CANARY_COUNTRIES: list[str] = []
    # Model IDs live here only. Verified against the Claude model list on 2026-11-18.
    ANTHROPIC_MODEL_FAST: str = "claude-haiku-5-5"
    ANTHROPIC_MODEL_STANDARD: str = "claude-sonnet-5-5"
    ANTHROPIC_MODEL_ADVANCED: str = "claude-opus-5-5"
    # Per-feature effort on Anthropic models that support it (low|medium|high).
    # Classification stays low; the others are chosen from Step 2 eval results.
    ANTHROPIC_EFFORT_CLASSIFY: str = "low"
    ANTHROPIC_EFFORT_EXTRACT: str = "low"
    ANTHROPIC_EFFORT_CHAT: str = "low"
    # Per-model capabilities (JSON). Models not listed get the conservative default:
    # no temperature, no effort. Temperature is NEVER sent unless supports_temperature.
    AI_MODEL_CAPABILITIES: dict[str, dict[str, bool]] = {
        "claude-haiku-5-5": {"supports_temperature": False, "supports_effort": True},
        "claude-sonnet-5-5": {"supports_temperature": False, "supports_effort": True},
        "claude-opus-5-5": {"supports_temperature": False, "supports_effort": True},
    }
    # USD per million tokens: input, output, cache_read, cache_write (5 min).
    # Anthropic list prices verified 2026-11-18. Meta Muse Spark Standard-mode prices from
    # https://dev.meta.ai/docs/pricing-rate-limits, fetched 2026-11-18 (the page has no
    # effective date). Meta lists no cache-write price, so cache_write = input.
    AI_MODEL_PRICES: dict[str, dict[str, float]] = {
        "claude-haiku-5-5": {
            "input": 0.10,
            "output": 0.50,
            "cache_read": 0.01,
            "cache_write": 0.125,
        },
        "claude-sonnet-5-5": {"input": 2.0, "output": 10.0, "cache_read": 0.10, "cache_write": 2.5},
        "claude-opus-5-5": {"input": 4.0, "output": 20.0, "cache_read": 0.20, "cache_write": 5.0},
        "muse-spark-1.3": {"input": 1.25, "output": 4.25, "cache_read": 0.15, "cache_write": 1.25},
        "muse-spark-1.2": {"input": 1.25, "output": 4.25, "cache_read": 0.15, "cache_write": 1.25},
        "muse-spark-1.1": {"input": 1.25, "output": 4.25, "cache_read": 0.15, "cache_write": 1.25},
    }
    # Total time budget per feature, INCLUDING the fallback attempt (enforced by the router).
    # Classify is 15 s, not 10 s: Meta alone measured 7.6-9.8 s on 2026-11-18, so a 10 s
    # total left no room for the fallback after a fast primary failure (pending approval).
    AI_TIMEOUT_CLASSIFY_MS: int = 15_000
    AI_TIMEOUT_EXTRACT_MS: int = 30_000
    AI_TIMEOUT_CHAT_TTFT_MS: int = 8_000
    # Share of the budget the primary may use, so the fallback still has time.
    AI_PRIMARY_BUDGET_SHARE: float = 0.6
    # Router retries per provider (0-2), only before any output and only for side-effect-free calls.
    AI_ROUTER_MAX_RETRIES: int = 1
    AI_BREAKER_FAILURE_THRESHOLD: int = 5
    AI_BREAKER_COOLDOWN_MS: int = 30_000
    # Daily cost caps (USD, 0 = no cap). Spend is persisted in ai_spend_daily.
    AI_DAILY_BUDGET_USD: float = 0.0
    AI_KITCHEN_DAILY_BUDGET_USD: float = 0.0
    AI_BUDGET_EXCEEDED_ACTION: Literal["cheaper_tier", "fallback", "block"] = "fallback"
    # Ops token for GET /api/v1/ai/health (no chef roles exist). Empty = endpoint disabled.
    AI_OPS_TOKEN: SecretStr = SecretStr("")

    @field_validator("AI_MODEL_CAPABILITIES", "AI_MODEL_PRICES", mode="before")
    @classmethod
    def parse_json_maps(cls, v: object) -> object:
        if isinstance(v, str):
            import json

            return json.loads(v) if v.strip() else {}
        return v

    @field_validator("AI_ROUTER_MAX_RETRIES")
    @classmethod
    def cap_retries(cls, v: int) -> int:
        return max(0, min(v, 2))

    # Food Bundles catalog
    FOOD_BUNDLES_CATALOG_PROVIDER: Literal["mock", "live"] = "mock"
    # Countries (ISO 3166-1 alpha-2) Food Bundles serves: only kitchens there see the
    # catalogue and can order catalogue items (decision 9, 2026-11-19). JSON list in env.
    FOOD_BUNDLES_COUNTRIES: list[str] = ["RW"]
    # Currency of Food Bundles catalogue reference prices (ISO 4217).
    FOOD_BUNDLES_CATALOG_CURRENCY: str = "RWF"
    # Local hour (kitchen time zone) for the daily low-stock push reminder.
    LOW_STOCK_REMINDER_LOCAL_HOUR: int = 7
    # Default step (major units) for suggested selling prices per currency; other currencies
    # use their smallest unit. A kitchen can override its own step (decision 7, 2026-11-19).
    PRICE_ROUNDING_STEPS: dict[str, str] = {
        "RWF": "100",
        "UGX": "500",
        "KES": "10",
        "NGN": "50",
        "USD": "0.50",
        "EUR": "0.50",
    }
    FOOD_BUNDLES_API_URL: str = ""
    FOOD_BUNDLES_API_KEY: SecretStr = SecretStr("")
    # Exchange rates (Step 2a decision 1-2, 2026-11-19). Rates come ONLY from these services,
    # through the daily job into the exchange_rates table; AI models never produce rates.
    # ExchangeRate-API (paid plan) is primary; with no key, Frankfurter serves alone.
    EXCHANGE_RATE_API_KEY: SecretStr = SecretStr("")
    EXCHANGE_RATE_API_URL: str = "https://v6.exchangerate-api.com/v6"
    FRANKFURTER_API_URL: str = "https://api.frankfurter.dev/v2"
    EXCHANGE_RATE_TIMEOUT_SECONDS: float = 20.0
    # A rate is usable up to this many days old (weekends); older or missing = unavailable.
    RATE_STALE_DAYS: int = 3
    # Countries (ISO 3166-1 alpha-2) whose kitchens may CONVERT between currencies (currency
    # change "convert", foreign-currency ingredient costs, rates shown). Off elsewhere until a
    # licensed rate source is confirmed in writing (docs/design/exchange-rate-licences.md).
    # Development (APP_ENV=development) enables it everywhere. Prices in a kitchen's own
    # currency work in every country regardless. JSON list in env.
    CURRENCY_CONVERSION_ENABLED_COUNTRIES: list[str] = ["RW"]

    # Object storage
    OBJECT_STORAGE_PROVIDER: Literal["local", "s3", "gcs", "cloudinary"] = "local"
    OBJECT_STORAGE_BUCKET: str = "food-bundles-chef"
    OBJECT_STORAGE_ACCESS_KEY: SecretStr = SecretStr("")
    OBJECT_STORAGE_SECRET_KEY: SecretStr = SecretStr("")
    OBJECT_STORAGE_ENDPOINT_URL: str = ""
    LOCAL_STORAGE_PATH: str = "./storage"
    # Cloudinary (used when OBJECT_STORAGE_PROVIDER=cloudinary)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: SecretStr = SecretStr("")
    CLOUDINARY_API_SECRET: SecretStr = SecretStr("")

    # Push notifications
    PUSH_NOTIFICATIONS_PROVIDER: Literal["mock", "expo"] = "mock"
    EXPO_ACCESS_TOKEN: SecretStr = SecretStr("")

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
