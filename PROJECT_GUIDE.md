# Fuel Flow — Project Guide

This document complements the root README. It focuses on:

1) What makes this project different from a typical CRUD app
2) How the project works end-to-end (request flow + event flow)
3) What features are implemented today (frontend + backend)

If you want run instructions, see [RUNNING.md](RUNNING.md).

---

## 1) What makes Fuel Flow different

Most “fuel management” demo projects are either:

- A single monolithic backend (one API) + a UI, or
- A UI-only prototype with no realistic backend behavior

Fuel Flow is intentionally closer to a production-style architecture, while still being easy to run locally.

### Differentiators (real reasons)

- **Microservices, not one API**
  - Backend responsibilities are split into focused services (Identity, Sales, Inventory, Station, etc.).
  - Each service owns its own database schema (separate DB per service on the same SQL Server instance in dev).

- **API Gateway in front (single entry point)**
  - Browser calls only the gateway (`http://localhost:5000`).
  - The gateway routes `/gateway/*` requests to the right microservice via Ocelot.
  - This mirrors real deployments where clients never call internal service ports directly.

- **Event-driven workflows (RabbitMQ)**
  - Sales, inventory, fraud detection, notifications, and audit are connected via queue events.
  - This shows how “one action triggers multiple outcomes” without tightly coupling services.

- **Operational concerns included**
  - Rate limiting exists on some gateway routes (Ocelot `RateLimitOptions`).
  - Idempotency is implemented for creating sales transactions (retry-safe writes).
  - Caching is implemented in the Inventory service using Redis (optional; degrades gracefully).

- **Demo-friendly UI + realistic backend**
  - The UI is fully navigable and role-based.
  - Some admin directory screens use `localStorage` demo data so the UI remains usable even before the DB has a lot of records.

- **Optional “real-world” integrations**
  - Razorpay order creation + signature verification.
  - AI assistant chat endpoint (Gemini) to provide user guidance.

---

## 2) How the project works (end-to-end)

### 2.1 Components (what runs)

- **Frontend**: Angular SPA at `http://localhost:4200`
- **Gateway**: Ocelot + direct helper endpoints at `http://localhost:5000`
- **Microservices**: 8 APIs (ports 5001–5008)
- **Infra** (Docker):
  - SQL Server (1433)
  - Redis (6379)
  - RabbitMQ (5672 + management UI at 15672)

See [docker-compose.yml](docker-compose.yml) for the exact container wiring.

### 2.2 Frontend routing & roles

The Angular app is split into lazy-loaded modules:

- Landing: `/`
- Auth: `/auth/*`
- Customer: `/customer/*` (guarded)
- Dealer: `/dealer/*` (guarded)
- Admin: `/admin/*` (guarded)

Role enforcement:

- `AuthGuard` blocks access when there is no JWT.
- `RoleGuard` checks the logged-in user role and redirects to the correct dashboard.
- `AuthInterceptor` attaches `Authorization: Bearer <token>` to API calls.

Code pointers:

- Routing: [frontend/fuel-management-web/src/app/app-routing.module.ts](frontend/fuel-management-web/src/app/app-routing.module.ts)
- Guards: [frontend/fuel-management-web/src/app/core/guards](frontend/fuel-management-web/src/app/core/guards)
- Interceptor: [frontend/fuel-management-web/src/app/core/interceptors/auth.interceptor.ts](frontend/fuel-management-web/src/app/core/interceptors/auth.interceptor.ts)

### 2.3 Backend request flow (HTTP)

1) Browser calls the gateway, e.g. `POST /gateway/sales/transactions`
2) Ocelot routes the request to the Sales service, e.g. `http://sales:8080/api/transactions` in Docker
3) The microservice validates JWT + roles
4) The microservice reads/writes SQL Server using EF Core
5) The response returns back through the gateway

Gateway selection of route config:

- Gateway loads `ocelot.json` for local runs
- Docker compose sets `OCELOT_FILE=ocelot.docker.json` so routes point to container names

Code pointers:

- Gateway startup + direct endpoints: [src/Gateway/FuelManagement.Gateway/Program.cs](src/Gateway/FuelManagement.Gateway/Program.cs)
- Gateway routes (local): [src/Gateway/FuelManagement.Gateway/ocelot.json](src/Gateway/FuelManagement.Gateway/ocelot.json)

### 2.4 Backend event flow (RabbitMQ)

Some behaviors are asynchronous (publish/subscribe):

- Sales publishes:
  - `sale-recorded`
  - `audit-log`
- Inventory publishes:
  - `stock-updated`
  - `fuel-price-updated`
- FraudDetection consumes `sale-recorded` and publishes `fraud-alerts`
- Notification consumes `sale-recorded`, `stock-updated`, `fuel-price-updated`, `fraud-alerts`
- Audit consumes `audit-log`

Shared event contract types live in:

- [src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs](src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs)

The RabbitMQ abstraction is implemented in:

- [src/Shared/FuelManagement.Common/Messaging/RabbitMqService.cs](src/Shared/FuelManagement.Common/Messaging/RabbitMqService.cs)

### 2.5 A realistic example: Dealer records a sale

1) Dealer uses the UI (Dealer → “New Sale”).
2) UI calls the gateway: `POST /gateway/sales/transactions`.
3) Sales service:
   - validates pump status
   - creates a transaction (receipt number is generated)
   - supports idempotency with the `Idempotency-Key` header
   - publishes events:
     - `SaleRecordedEvent` → queue `sale-recorded`
     - `AuditEvent` → queue `audit-log`
4) Other services react:
   - FraudDetection evaluates rules and may create a fraud alert + publish `fraud-alerts`.
   - Notification may create notifications (e.g., high-value sale alerts).
   - Audit records a persistent audit trail.

Code pointers:

- Transaction creation + event publish: [src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs](src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs)
- Fraud rule evaluation (background service): [src/Services/FraudDetection/FuelManagement.FraudDetection.API/FraudDetectionBackgroundService.cs](src/Services/FraudDetection/FuelManagement.FraudDetection.API/FraudDetectionBackgroundService.cs)
- Notification consumers: [src/Services/Notification/FuelManagement.Notification.API/NotificationBackgroundService.cs](src/Services/Notification/FuelManagement.Notification.API/NotificationBackgroundService.cs)
- Audit consumer: [src/Services/Audit/FuelManagement.Audit.API/AuditBackgroundService.cs](src/Services/Audit/FuelManagement.Audit.API/AuditBackgroundService.cs)

---

## 3) Features implemented (what exists today)

This section is based on what’s currently in the repo, not “future ideas”.

### 3.1 Frontend features (Angular)

**Auth module** (`/auth/*`)

- Login
- Register
- Forgot password
- Reset password
- OTP verify

Routes live in:

- [frontend/fuel-management-web/src/app/auth/auth-routing.module.ts](frontend/fuel-management-web/src/app/auth/auth-routing.module.ts)

**Admin module** (`/admin/*`)

- Dashboard
- Users directory (demo-friendly: localStorage-backed directory)
- Reports
- Fraud view
- Stations directory (demo-friendly: localStorage-backed directory)
- Prices

Routes live in:

- [frontend/fuel-management-web/src/app/admin/admin-routing.module.ts](frontend/fuel-management-web/src/app/admin/admin-routing.module.ts)

**Dealer module** (`/dealer/*`)

- Dashboard
- New sale entry
- Inventory view
- Pump manager
- Shift summary

Routes live in:

- [frontend/fuel-management-web/src/app/dealer/dealer-routing.module.ts](frontend/fuel-management-web/src/app/dealer/dealer-routing.module.ts)

**Customer module** (`/customer/*`)

- Dashboard
- Prices
- Transactions
- Orders
- Receipt viewer (PDF-related UX)
- Nearby stations page (map-friendly UX)

Routes live in:

- [frontend/fuel-management-web/src/app/customer/customer-routing.module.ts](frontend/fuel-management-web/src/app/customer/customer-routing.module.ts)

**Demo-friendly directory layer**

Some screens intentionally use client-side demo storage:

- Users/stations directory data is persisted in `localStorage` via:
  - [frontend/fuel-management-web/src/app/core/services/directory.service.ts](frontend/fuel-management-web/src/app/core/services/directory.service.ts)

This is not “fake” in a bad way—it’s a deliberate choice so the UI can be shown instantly without needing to pre-seed a full database of stations/users.

### 3.2 Backend features (microservices)

**Gateway (Ocelot)**

- Single entry point (`/gateway/*`) for all services
- Swagger at `/swagger`
- Health endpoints (`/healthz`, `/health`)
- Optional endpoints:
  - AI chat: `POST /gateway/ai/chat` (needs `AI_ASSISTANT_API_KEY`)
  - Razorpay helpers: `POST /gateway/payments/create-order`, `POST /gateway/payments/verify` (needs Razorpay keys)

Code pointer:

- [src/Gateway/FuelManagement.Gateway/Program.cs](src/Gateway/FuelManagement.Gateway/Program.cs)

**Identity service**

- JWT issuing (login)
- Register
- Email OTP send/verify (SMTP-configurable)
- User seeding for dev:
  - `admin@fuel.local` / `Admin@123`
  - `dealer@fuel.local` / `Dealer@123`
  - `customer@fuel.local` / `Customer@123`

Code pointer:

- [src/Services/Identity/FuelManagement.Identity.API/Program.cs](src/Services/Identity/FuelManagement.Identity.API/Program.cs)

**Sales service**

- Create transaction (receipt number generation)
- List/filter/paginate transactions
- Station sales summary
- Pump APIs (create + update status)
- Idempotent create (via `Idempotency-Key` header)
- Publishes `sale-recorded` + `audit-log`

Code pointer:

- [src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs](src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs)

**Inventory service**

- Tanks CRUD + stock level updates
- Stock alert thresholds + triggered state
- Replenishment orders + delivery updates
- Pricing updates (single-tank + bulk by fuel type)
- Optional Redis caching for tank reads
- Publishes `stock-updated` + `fuel-price-updated`

Code pointer:

- [src/Services/Inventory/FuelManagement.Inventory.API/Controllers/InventoryControllers.cs](src/Services/Inventory/FuelManagement.Inventory.API/Controllers/InventoryControllers.cs)

**Station service**

- Station CRUD (Admin)
- Operating hours
- Nearby stations search endpoint (`/api/stations/nearby`)

Code pointer:

- [src/Services/Station/FuelManagement.Station.API/Controllers/StationsController.cs](src/Services/Station/FuelManagement.Station.API/Controllers/StationsController.cs)

**FraudDetection service**

- Background subscriber to `sale-recorded`
- Rule-based detection (examples: HighVolume, AfterHours, PriceDeviation)
- Persists fraud alerts
- Publishes `fraud-alerts`

Code pointer:

- [src/Services/FraudDetection/FuelManagement.FraudDetection.API/FraudDetectionBackgroundService.cs](src/Services/FraudDetection/FuelManagement.FraudDetection.API/FraudDetectionBackgroundService.cs)

**Notification service**

- Background subscribers:
  - low stock alerts from `stock-updated`
  - high-value sale alerts from `sale-recorded`
  - fraud email alerts from `fraud-alerts`
  - price-drop subscription emails from `fuel-price-updated`
- Persists notification logs

Code pointer:

- [src/Services/Notification/FuelManagement.Notification.API/NotificationBackgroundService.cs](src/Services/Notification/FuelManagement.Notification.API/NotificationBackgroundService.cs)

**Audit service**

- Background subscriber to `audit-log`
- Persists audit trail entries

Code pointer:

- [src/Services/Audit/FuelManagement.Audit.API/AuditBackgroundService.cs](src/Services/Audit/FuelManagement.Audit.API/AuditBackgroundService.cs)

**Reporting service**

- Reporting endpoints (read-oriented)
- Intended to be the place for cross-cutting analytics/report aggregation

Tip: check the service Swagger for the exact report endpoints:

- `http://localhost:5004/swagger` (when running)

---

## 4) If you want to verify features quickly

- Open gateway Swagger: `http://localhost:5000/swagger`
- Open each service Swagger (`http://localhost:5001/swagger` … `http://localhost:5008/swagger`)
- Open RabbitMQ UI: `http://localhost:15672` (guest/guest)

That combination shows:

- What endpoints exist (Swagger)
- What events are being published/consumed (RabbitMQ queues)
- Whether writes are being persisted (SQL Server)

---

## 5) Where to start reading code (recommended order)

1) [README.md](README.md) (high-level overview)
2) [RUNNING.md](RUNNING.md) (how to run)
3) [docker-compose.yml](docker-compose.yml) (what runs in Docker)
4) Gateway:
   - [src/Gateway/FuelManagement.Gateway/Program.cs](src/Gateway/FuelManagement.Gateway/Program.cs)
   - [src/Gateway/FuelManagement.Gateway/ocelot.json](src/Gateway/FuelManagement.Gateway/ocelot.json)
5) Shared contracts/messaging:
   - [src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs](src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs)
   - [src/Shared/FuelManagement.Common/Messaging/RabbitMqService.cs](src/Shared/FuelManagement.Common/Messaging/RabbitMqService.cs)
6) Core flows:
   - Sales → [src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs](src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs)
   - Inventory → [src/Services/Inventory/FuelManagement.Inventory.API/Controllers/InventoryControllers.cs](src/Services/Inventory/FuelManagement.Inventory.API/Controllers/InventoryControllers.cs)
   - Fraud/Notification/Audit background services
