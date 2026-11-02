# Food Bundles Chef App — Backend

**Order right. Receive right. Know your stock before service.**

The Food Bundles Chef App backend powers the kitchen operations, procurement, delivery receiving, inventory management, and stock-planning workflows for chefs using the Food Bundles platform.

It provides secure APIs and business logic connecting the mobile application to the platform's data, services, and AI capabilities.

> **Project status:** Backend implementation and integration are subject to the current development phase. Features described in this README are product and architectural requirements; they should not be considered implemented until verified in the codebase.

---

## 1. Project Overview

Food Bundles Chef App helps chefs manage kitchen operations with better visibility into purchasing, deliveries, inventory, and expected ingredient requirements.

The core operational workflow is:

**Order → Receive and Check → Know Stock → Reorder**

The backend is responsible for:

- Chef authentication and account management.
- Kitchen creation and management.
- Kitchen-specific data isolation.
- Ingredient catalog and recipe management.
- Menu and sales data management.
- Purchase planning and procurement calculations.
- Food Bundles orders.
- Delivery receiving and quality assessment.
- Inventory tracking and stock reconciliation.
- Offline synchronization with the mobile application.
- Restaurant collaboration and approval workflows.
- AI integrations for supported kitchen operations.
- Audit trails, notifications, and operational reporting.

The backend must remain reliable when network connectivity is unstable and must preserve accurate operational records.

## 2. Technology Stack

The proposed backend stack is:

| Area                | Technology                                     |
| ------------------- | ---------------------------------------------- |
| Language            | Python 3.12+                                   |
| API framework       | FastAPI                                        |
| Data validation     | Pydantic v2                                    |
| ORM                 | SQLAlchemy 2.x                                 |
| Database            | PostgreSQL                                     |
| Database migrations | Alembic                                        |
| Authentication      | JWT-based authentication                       |
| Testing             | pytest, HTTPX                                  |
| Code quality        | Ruff                                           |
| Type checking       | mypy or Pyright                                |
| Containerization    | Docker and Docker Compose                      |
| AI integration      | Meta Model API and selected open-weight models |

Use stable, compatible dependency versions. Pin dependencies and maintain a reproducible development environment.

Redis and background task infrastructure should only be introduced when a demonstrated workload requires them.

## 3. Backend Architecture

Use a **modular monolith** architecture.

The application should be organized around business domains rather than creating one large collection of unrelated routes and services.

Suggested structure:

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── database.py
│   │   ├── logging.py
│   │   ├── exceptions.py
│   │   └── dependencies.py
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │
│   ├── shared/
│   │   ├── schemas/
│   │   ├── enums/
│   │   ├── utils/
│   │   └── services/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── chefs/
│   │   ├── kitchens/
│   │   ├── catalog/
│   │   ├── menu/
│   │   ├── recipes/
│   │   ├── sales/
│   │   ├── purchasing/
│   │   ├── orders/
│   │   ├── deliveries/
│   │   ├── inventory/
│   │   ├── sync/
│   │   ├── notifications/
│   │   ├── restaurants/
│   │   ├── audit/
│   │   └── ai/
│   │
│   └── integrations/
│       └── meta/
│
├── migrations/
│   └── versions/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── api/
│   └── security/
│
├── scripts/
│
├── .env.example
├── .gitignore
├── alembic.ini
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
└── README.md
```

Each business module should own its relevant:

- Models.
- Schemas.
- API routes.
- Services.
- Repository or persistence logic.
- Business rules.
- Tests.

Keep API routes thin. Business logic belongs in services and domain-level functions.

Modules should communicate through explicit interfaces rather than relying on circular imports or direct access to another module's internal implementation.

## 4. Core Business Domains

### 4.1 Authentication and Chef Accounts

Each chef owns their account.

Requirements:

- Phone-number-based registration.
- OTP verification.
- Secure authentication and token management.
- One account per person.
- Account-level permissions.
- Token expiration, rotation, and revocation.
- OTP expiration, hashing, and rate limiting.

A chef may manage multiple kitchens using one account.

### 4.2 Kitchen Management

Each kitchen is an independent operational workspace.

Requirements:

- A chef can create and manage multiple kitchens.
- Every kitchen has its own operational records.
- Kitchen data must not leak across kitchens.
- Past kitchens can be archived.
- Switching kitchens must update the active kitchen context.
- All kitchen-owned records must carry a `kitchen_id`.

### 4.3 Catalog

The catalog provides standardized ingredient and product records.

Requirements:

- Ingredient and product identifiers.
- Standardized units and selling units.
- Ingredient categories.
- Unit conversions where supported.
- Catalog SKU validation for AI-assisted operations.

AI-generated ingredient references must resolve to existing catalog SKUs. The system must not silently create unverified catalog items.

### 4.4 Recipes, Menu and Sales

The system should support recipe and ingredient relationships, menu records, and sales information.

Recipe quantities and ingredient yields must be represented consistently so that purchasing and stock calculations remain deterministic.

Menu du Jour, detailed menu costing, and margin analysis may be delivered in later development phases.

### 4.5 Purchasing and Orders

The purchasing module calculates ingredient requirements and supports procurement workflows.

The system should support:

- Purchase planning.
- Ingredient requirements.
- Stock-aware purchasing.
- Food Bundles orders.
- Order status tracking.
- Supplier and price records where applicable.
- Idempotent order creation and updates.

Two order workflows must be supported as product requirements:

1. A chef orders directly through Food Bundles checkout.
2. A chef submits an order to a linked restaurant for review, approval, editing, rejection, and payment processing.

The exact release phase and workflow ownership for restaurant approval must be documented as a product decision before implementation.

### 4.6 Delivery Receiving

Delivery receiving is a central feature of the application.

The backend must support receiving and checking individual crates, bags, trays, or other delivery units.

A delivery record should capture:

- Related order.
- Kitchen.
- Supplier or source.
- Ordered quantity.
- Delivered quantity.
- Accepted quantity.
- Actual measured weight or count.
- Actual price where available.
- Delivery photographs.
- Quality assessment.
- Chef acceptance or rejection.
- Receiving timestamp.
- Short-delivery status.

The chef must be able to complete receiving manually without using AI.

A delivery is considered short when the accepted quantity is more than 5% below the ordered quantity.

### 4.7 Inventory

Inventory records must reflect actual kitchen operations.

The system must support:

- Opening stock.
- Accepted deliveries.
- Expected ingredient use.
- Closing stock.
- Stock adjustments.
- Low-stock identification.
- Stock history.

The opening stock calculation is:

`Opening Stock = Previous Closing Stock + Accepted Deliveries - Expected Use`

Days of stock cover:

`Days Cover = Available Stock / Expected Daily Use`

A stock level below one day of cover is considered low stock.

Calculations must handle zero or missing expected daily use safely.

### 4.8 Offline Synchronization

The mobile application must remain usable during temporary network interruptions.

The backend must support reliable synchronization with the mobile application's local storage and mutation queue.

Requirements:

- Idempotency keys for retryable mutations.
- At-least-once delivery handling.
- Duplicate request protection.
- Conflict detection.
- Optimistic concurrency where appropriate.
- Server timestamps.
- Clear synchronization responses.
- Explicit conflict resolution rules.

The backend must inspect the actual mobile application's SQLite schema, repositories, mutation queue, and domain models before finalizing synchronization contracts.

Do not assume that all mobile operations can be safely overwritten by the latest request.

### 4.9 Restaurant Collaboration

Restaurant access must be explicitly authorized by the chef.

Requirements:

- Optional restaurant linking.
- Restaurant-owner approval where required.
- Explicit sharing scopes.
- Permission checks on every request.
- No unrestricted access to a chef's kitchens.
- Auditable sharing and approval actions.

A restaurant must only see information the chef has explicitly authorized it to access.

---

## 5. Deterministic Business Calculations

Business-critical calculations must be implemented in Python, covered by automated tests, and produce reproducible results.

AI must never generate or independently determine financial, inventory, purchasing, or stock calculations.

### 5.1 Expected Portions

Expected portions are calculated using a weighted average of the previous four weeks:

| Sales period      | Weight |
| ----------------- | -----: |
| Most recent week  |    40% |
| Previous week     |    20% |
| Two weeks prior   |    20% |
| Three weeks prior |    20% |

### 5.2 Safety Buffer

Default safety buffer: 10%.

The buffer should be configurable through an explicit business setting.

### 5.3 Expected Ingredient Requirement

The ingredient requirement is calculated using:

`Expected Ingredient Requirement = Expected Portions × Recipe Quantity per Portion ÷ Yield`

### 5.4 Purchase Quantity

`Quantity to Buy = Expected Ingredient Requirement - Available Stock`

Round the resulting purchase quantity up to the applicable selling unit.

Never allow negative purchase quantities. If available stock meets or exceeds the requirement, the quantity to buy is zero.

### 5.5 Expected Daily Use

`Expected Daily Use = (Weekly Sales / Days Open) × Recipe Quantity per Portion ÷ Yield`

Handle missing sales data, zero operating days, missing yields, and incompatible units explicitly.

Use Python `Decimal` for monetary values and other calculations requiring precise decimal arithmetic.

Do not use binary floating-point arithmetic for financial calculations.

---

## 6. Meta AI and Model Integrations

Meta AI models are part of the planned backend integration strategy.

The backend must use a provider-independent AI integration layer so that model providers can be changed without rewriting core business modules.

Official resources:

- Meta Model API: https://dev.meta.ai/products/meta-model-api
- Muse Spark: https://dev.meta.ai/models/muse-spark
- Muse Wonder: https://dev.meta.ai/models/muse-wonder
- Muse Image: https://dev.meta.ai/models/muse-image
- Muse Voice Transcribe: https://dev.meta.ai/models/muse-voice-transcribe
- SAM 3.1: https://dev.meta.ai/models/sam-3-1
- Muse Glimmer: https://dev.meta.ai/models/muse-glimmer
- Muse Spark Open: https://dev.meta.ai/models/muse-spark-open

### 6.1 Meta Model API

Use the official API base URL:

`https://api.meta.ai/v1`

Authentication must use a server-side Bearer token stored securely in environment configuration.

The API key must never be included in mobile application code or exposed to clients.

Implement a dedicated Meta integration layer responsible for:

- Authentication.
- Model selection.
- Request and response validation.
- Timeouts.
- Retry handling.
- Error normalization.
- Usage and latency tracking.
- Provider-specific request formatting.

Use current official model documentation and model discovery rather than assuming model identifiers.

### 6.2 Model Responsibilities

**Muse Spark**

Use for appropriate high-volume, latency-sensitive AI tasks.

Potential use cases include structured extraction, classification, and assistance with kitchen workflows.

**Muse Wonder**

Use for more complex, multi-step reasoning tasks where additional capability justifies the latency and cost.

**Muse Image**

Use for supported image generation and image-editing features.

Generated images must never be treated as evidence that a food delivery was received, inspected, or passed quality control.

**Muse Voice Transcribe**

Use for speech-to-text features, such as converting a chef's voice notes into text.

It is a transcription capability, not a text-to-speech service.

**SAM 3.1**

Use for supported image segmentation and visual localization tasks, such as identifying or isolating visible objects in delivery images.

SAM 3.1 is an open-weight model that is also available through Meta Model API. Its deployment route must be selected according to the use case, operational cost, and infrastructure requirements.

Segmentation is not a food freshness or spoilage assessment.

### 6.3 Open-Weight Models

**Muse Glimmer**

Evaluate Muse Glimmer for local or self-hosted multimodal workloads.

Its deployment should be optional and isolated behind the AI provider interface.

**Muse Spark Open**

Evaluate Muse Spark Open for workloads where self-hosting or third-party inference is justified.

It has substantial infrastructure requirements. Do not provision expensive GPU infrastructure before benchmarking the actual workload and assessing cost, latency, throughput, and operational requirements.

For both models:

- Keep model serving separate from the main API process.
- Use authenticated internal endpoints.
- Validate model outputs.
- Monitor resource consumption.
- Provide fallback behavior.
- Document licensing and usage restrictions.
- Do not make the main backend dependent on a locally hosted model being available.

### 6.4 AI-Assisted Delivery Quality Assessment

AI may assist the chef by evaluating visible delivery characteristics.

The six assessment dimensions are:

1. Freshness.
2. Ripeness.
3. Damage.
4. Spoilage.
5. Size or grade.
6. Foreign matter.

Each dimension should return a structured result:

- `pass`
- `watch`
- `fail`

A quality score between 0 and 100 may be returned alongside the assessment.

AI assessments are advisory. The chef retains final authority to accept, partially accept, or reject a delivery.

The AI must not invent weight or count.

If a crate is not fully visible, the quantity estimate must be `null`, not a guessed value.

Actual chef-entered measurements must always take precedence over image-based estimates.

### 6.5 AI Validation and Reliability

AI responses must:

- Follow a strict JSON schema.
- Be validated with Pydantic.
- Retry schema validation once when appropriate.
- Respect a 20-second default timeout.
- Enforce image uploads below 1 MB.
- Use catalog SKUs for ingredient references.
- Log model calls, latency, status, and usage metadata.
- Avoid logging sensitive image or supplier content by default.

AI failures must not prevent manual delivery receiving or ordinary inventory operations.

### 6.6 AI Environment Configuration

Use environment variables for provider configuration.

Example:

```dotenv
META_MODEL_API_BASE_URL=https://api.meta.ai/v1
MODEL_API_KEY=

META_MUSE_SPARK_MODEL=
META_MUSE_WONDER_MODEL=
META_MUSE_IMAGE_MODEL=muse-image-1.0
META_MUSE_VOICE_MODEL=muse-voice-transcribe-1.0
META_SAM_MODEL=

MUSE_GLIMMER_BASE_URL=
MUSE_GLIMMER_MODEL=

MUSE_SPARK_OPEN_BASE_URL=
MUSE_SPARK_OPEN_MODEL=

AI_ENABLED=false
AI_DEFAULT_TIMEOUT_SECONDS=20
AI_MAX_RETRIES=1
AI_MAX_IMAGE_SIZE_BYTES=1048576
AI_LOG_CONTENT=false
```

Keep secrets out of source control. Provide safe defaults that disable AI when credentials are missing.

Model IDs and API capabilities must be checked against current official Meta documentation before enabling production integrations.

### 6.7 AI Governance and Data Protection

Before sending data to any external model provider:

- Identify the data being transmitted.
- Confirm that transmission is necessary.
- Minimize personal and commercial information.
- Do not send unrelated supplier records or confidential supplier data.
- Review the applicable model and API data-use terms.
- Keep Standard and Contributor model designations distinct.
- Obtain explicit approval before using Contributor models with sensitive data.
- Maintain an audit trail of AI-assisted operations.

AI must never become the source of truth for inventory, orders, financial records, or chef acceptance decisions.

---

## 7. Security and Data Isolation

Security must be built into the application from the beginning.

### 7.1 Authentication

- Secure OTP verification.
- Hashed OTP storage.
- Expiration and rate limiting.
- JWT access tokens.
- Secure token refresh and revocation.
- No hardcoded secrets.

### 7.2 Kitchen-Level Authorization

Every kitchen-owned database record must be scoped to its kitchen.

Enforce:

1. Authentication at the API layer.
2. Authorization for the requested kitchen.
3. Ownership and membership validation.
4. Database-level Row-Level Security (RLS) as defense-in-depth.

RLS does not replace application-level authorization.

Every request must establish the correct tenant context. Background jobs and synchronization operations must follow the same isolation rules.

### 7.3 Restaurant Permissions

Restaurant access must be limited to explicitly shared data.

Implement permission checks and audit records for:

- Linking.
- Approval.
- Scope changes.
- Access revocation.
- Order review.
- Other authorized operations.

### 7.4 Privacy

Do not send confidential supplier information to Food Bundles or Meta unless explicitly authorized and necessary for the feature.

Protect credentials, personal data, images, and operational records.

The application references Rwanda's Law No. 058/2021 relating to the protection of personal data and privacy. Legal compliance must be reviewed by qualified legal counsel rather than assumed from technical implementation alone.

---

## 8. API Standards

All public APIs should be versioned under:

`/api/v1`

Use consistent conventions:

- RESTful resource-oriented endpoints.
- Pydantic request and response schemas.
- Explicit HTTP status codes.
- Consistent error responses.
- Pagination for collection endpoints.
- Filtering and sorting where appropriate.
- UTC timestamps.
- Decimal-safe financial representations.
- Idempotency for retryable mutations.
- Authentication and authorization on protected resources.

Example endpoint organization:

```text
/api/v1/auth
/api/v1/chefs
/api/v1/kitchens
/api/v1/catalog
/api/v1/recipes
/api/v1/menu
/api/v1/sales
/api/v1/purchasing
/api/v1/orders
/api/v1/deliveries
/api/v1/inventory
/api/v1/sync
/api/v1/restaurants
/api/v1/notifications
```

Keep the API contract aligned with the mobile application's actual data models and repository interfaces.

Avoid implementing endpoints based only on assumptions about the frontend.

---

## 9. Database and Migrations

Use PostgreSQL as the primary database.

Use SQLAlchemy 2.x for persistence and Alembic for schema migrations.

Requirements:

- Explicit primary and foreign keys.
- Correct indexes for common access patterns.
- Kitchen-scoped records.
- Appropriate unique constraints.
- Database transactions for multi-step operations.
- Referential integrity.
- UTC timestamps.
- Safe and reversible migrations where possible.
- RLS policies for tenant isolation.

Never modify production database schemas manually without a corresponding migration.

Migration changes must be reviewed and tested before deployment.

---

## 10. Testing Requirements

Automated testing is mandatory.

### Unit Tests

Cover:

- Purchase calculations.
- Expected portions.
- Safety buffer.
- Ingredient yield.
- Days of stock cover.
- Short-delivery detection.
- Unit conversion.
- Price calculations.
- AI response validation.

### Integration Tests

Cover:

- Database persistence.
- Authentication.
- Kitchen ownership.
- Kitchen isolation.
- Order creation.
- Delivery receiving.
- Inventory updates.
- Offline synchronization.
- Restaurant access permissions.

### Security Tests

Verify:

- One chef cannot access another chef's private records.
- One kitchen cannot access another kitchen's data.
- Restaurant access is restricted to approved scopes.
- Unauthorized users cannot modify records.
- Invalid or expired tokens are rejected.
- Duplicate mutations do not create duplicate business records.

### AI Tests

Use mocked model responses for deterministic tests.

Verify:

- Valid JSON responses.
- Invalid JSON responses.
- Schema validation.
- Retry behavior.
- Timeout handling.
- Missing quantity estimates.
- Unknown catalog SKU rejection.
- Manual fallback when AI is unavailable.

Core business calculations must never depend on live AI API calls during unit testing.

---

## 11. Local Development Setup

### Prerequisites

Install:

- Python 3.12 or newer.
- Git.
- Docker Desktop.
- PostgreSQL (or use Docker Compose).
- A virtual environment tool.

### 11.1 Clone and Enter the Backend

```powershell
cd food-bundles-chef-app\backend
```

### 11.2 Create a Virtual Environment

```powershell
py -3.12 -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\Activate.ps1
```

### 11.3 Install Dependencies

If the project uses `pyproject.toml`:

```powershell
python -m pip install --upgrade pip
pip install -e ".[dev]"
```

Adjust this command to match the dependency groups actually defined in the project.

### 11.4 Configure Environment Variables

Copy the example configuration:

```powershell
Copy-Item .env.example .env
```

Configure the database URL, authentication secrets, and other required settings.

Never commit `.env` or real credentials.

### 11.5 Start the Database

If Docker Compose is configured:

```powershell
docker compose up -d db
```

### 11.6 Apply Migrations

```powershell
alembic upgrade head
```

### 11.7 Start the API

```powershell
uvicorn app.main:app --reload
```

The development API should be accessible at:

`http://127.0.0.1:8000`

FastAPI documentation:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

These URLs assume the default development configuration.

---

## 12. Quality Checks

Run automated tests:

```powershell
pytest
```

Run Ruff:

```powershell
ruff check .
ruff format --check .
```

Run type checking using the configured tool:

```powershell
mypy app
```

or:

```powershell
pyright
```

The exact commands should match the project's `pyproject.toml` configuration.

All tests and quality checks should pass before merging changes.

---

## 13. Mobile Application Integration

The backend serves the Food Bundles Chef mobile application.

Integration must account for:

- Existing TypeScript domain models.
- Existing API and repository interfaces.
- SQLite persistence.
- Local mutation queues.
- Offline-first workflows.
- Retry behavior.
- Conflict handling.
- Authentication lifecycle.
- Image upload and compression.
- Kitchen switching.
- API versioning.

Before implementing or changing API contracts, inspect the actual mobile source code.

Do not introduce a second definition of a business rule when the same rule already exists in the mobile domain layer. Instead, establish the backend as the authoritative source for persisted operational state and deterministic server-side calculations, with consistent client-side behavior.

Mock services in the mobile application must not be mistaken for live backend integrations.

---

## 14. Development Roadmap

The backend should be delivered incrementally.

| Phase | Scope                                              |
| ----- | -------------------------------------------------- |
| 1     | Project foundation and configuration               |
| 2     | Modular architecture, database and migrations      |
| 3     | Authentication, chefs and kitchen isolation        |
| 4     | Core kitchen domain and deterministic calculations |
| 5     | Catalog, purchasing and Food Bundles orders        |
| 6     | Delivery receiving and quality assessment          |
| 7     | Offline synchronization and mobile integration     |
| 8     | Security, observability and release readiness      |
| 9     | Meta AI integrations and governance                |

Each phase must have documented acceptance criteria, automated tests, and reviewed database changes.

Do not start a later phase while critical security or data-integrity requirements from an earlier phase remain unresolved.

---

## 15. Engineering Principles

All backend development must follow these principles:

1. **Accuracy first:** Business calculations must be deterministic and testable.
2. **Kitchen isolation:** Kitchen data must remain isolated.
3. **Chef authority:** AI assists; the chef makes operational decisions.
4. **Offline resilience:** Temporary connectivity failures must not destroy operational data.
5. **Explicit permissions:** No implicit restaurant or cross-kitchen access.
6. **Secure by default:** Secrets, tokens, and private data must be protected.
7. **Modular architecture:** Business domains must have clear responsibilities.
8. **API consistency:** Backend contracts must match actual mobile application requirements.
9. **Observable operations:** Important actions, errors, and synchronization events must be traceable.
10. **Provider independence:** AI providers must be replaceable without rewriting business logic.

## 16. Definition of Done

A backend feature is complete only when:

- Its business requirements are documented.
- Its API contract is defined.
- Authorization and kitchen isolation are enforced.
- Database changes have migrations.
- Business logic is implemented outside API route handlers.
- Relevant unit and integration tests pass.
- Error handling is implemented.
- Offline and retry behavior is considered where relevant.
- Logs and audit events are added where appropriate.
- Mobile integration requirements are documented.
- No secrets or sensitive data are exposed.
- Documentation is updated.

**The ultimate objective is a reliable backend that helps chefs order accurately, receive deliveries confidently, maintain trustworthy stock records, and know what to purchase before service.**
