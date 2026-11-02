from __future__ import annotations

# Financial
DEFAULT_CURRENCY = "RWF"

# Purchasing calculations
SAFETY_BUFFER_FRACTION = 0.10  # 10% buffer applied to weighted expected portions (mobile: weighted * 1.1)
SHORT_DELIVERY_THRESHOLD = 0.05  # flag when accepted < ordered by more than 5%
LOW_STOCK_DAYS_THRESHOLD = 1.0  # < 1 day of cover = low stock
TARGET_DAYS_COVER = 3  # purchasing screen target stock cover in days

# Weighted demand: latest week weight, then 3 prior weeks each (must sum to 1.0)
DEMAND_WEIGHTS = (0.40, 0.20, 0.20, 0.20)

MAX_SEATING_CAPACITY = 2000  # kitchen validation ceiling (from mobile Zod schema)

# Quality assessment dimensions
QUALITY_DIMENSIONS = (
    "freshness",
    "ripeness",
    "physical_damage",
    "spoilage",
    "size_and_grade",
    "foreign_matter",
)

# OTP
OTP_LENGTH = 6

# Image uploads
MAX_IMAGE_SIZE_BYTES = 1_048_576  # 1 MB — aligned with mobile compression target

# Supported locales
SUPPORTED_LOCALES = ("en", "rw", "fr")
DEFAULT_LOCALE = "en"
