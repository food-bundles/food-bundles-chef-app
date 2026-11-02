from __future__ import annotations

# Financial
DEFAULT_CURRENCY = "RWF"

# Purchasing calculations
SAFETY_BUFFER_FRACTION = 0.10  # 10% buffer on expected ingredient requirement
SHORT_DELIVERY_THRESHOLD = 0.05  # flag when accepted < ordered by more than 5%
LOW_STOCK_DAYS_THRESHOLD = 1.0  # < 1 day of cover = low stock

# Weighted demand: latest week weight, then 3 prior weeks each
DEMAND_WEIGHTS = (0.40, 0.20, 0.20, 0.20)  # must sum to 1.0

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
