# Fuel Flow (FuelManagement)

Fuel Flow is a demo-friendly **fuel station management** system built as an **Angular SPA** + a **.NET microservices backend** behind an **API Gateway**.

At a high level:

- The **frontend** is a role-based website (Admin / Dealer / Customer).
- The **backend** is split into focused microservices (Identity, Sales, Inventory, Station, etc.).
- The **Gateway** (Ocelot) is the single HTTP entry-point used by the browser.
- **RabbitMQ** is used for asynchronous, event-driven flows (audit logs, fraud alerts, stock updates, notifications).

For step-by-step instructions to run everything, see [RUNNING.md](RUNNING.md).

---

## What is this project about?

Fuel Flow is designed to model a real-world fuel station ecosystem:

- **Admin** manages users, stations, prices, and oversees fraud/audit.
- **Dealer** (station operator) records sales, manages pumps, and updates inventory.
- **Customer** views prices/stations and can access receipts/transactions.

It’s intentionally “demo-friendly”: the UI is fully navigable, and some directory/dashboard screens use `localStorage` demo data to keep the experience smooth even when the backend is not fully populated.

---

## Key features (what you can do)

### Authentication & roles
- JWT login/logout via the **Identity** service
- Role-based route guards in the Angular app (**AuthGuard** + **RoleGuard**)
- Email OTP flows (SMTP-configurable)

### Station operations
- Station directory + station creation/updates (Admin)
- Pump management (Admin creates pumps; Admin/Dealer updates status)
- Nearby station discovery endpoint (`/api/stations/nearby`) used for map-style UX

### Inventory & pricing
- Tank management + stock level updates
- Stock alerts with thresholds and “triggered” state
- Replenishment orders and delivery flow
- Fuel price updates (single-tank + bulk by fuel type)
- Redis-backed caching for tank list reads (optional, graceful degradation)

### Sales
- Record sales transactions with receipt numbers
- Simple filtering/pagination + station summary endpoints
- Idempotency support for transaction creation (via `Idempotency-Key` request header)

### Audit, fraud, and notifications (event-driven)
- Sales emits `sale-recorded` and `audit-log` events
- Inventory emits `stock-updated` and `fuel-price-updated` events
- FraudDetection consumes sales events, evaluates rules, stores alerts, and emits `fraud-alerts`
- Notification consumes multiple events and stores notification logs; also supports price-drop email subscriptions
- Audit consumes audit events and stores them as an audit trail

### Optional integrations
- Razorpay payment order creation + signature verification (Gateway endpoints)
- AI assistant chat endpoint (Gateway → Google Gemini API)

---

## Architecture (how it works)

### Request flow (synchronous HTTP)

The browser talks only to the gateway:

`Angular SPA → API Gateway (Ocelot) → Microservice → SQL Server`

The gateway exposes `/gateway/*` routes which proxy to each service.

### Event flow (asynchronous RabbitMQ)

Some actions “fan out” to multiple services using RabbitMQ queues:

```mermaid
flowchart LR
  UI[Angular SPA] -->|HTTP /gateway/*| G[API Gateway\n(Ocelot)]

  subgraph Sync APIs
    G --> ID[Identity]
    G --> INV[Inventory]
    G --> SALES[Sales]
    G --> ST[Station]
    G --> REP[Reporting]
    G --> NOTIF[Notification]
    G --> FRAUD[FraudDetection]
    G --> AUD[Audit]
  end

  subgraph Data
    SQL[(SQL Server)]
    REDIS[(Redis - optional)]
  end

  ID --> SQL
  INV --> SQL
  SALES --> SQL
  ST --> SQL
  REP --> SQL
  NOTIF --> SQL
  FRAUD --> SQL
  AUD --> SQL
  INV -. cache .-> REDIS

  MQ((RabbitMQ))
  SALES -->|sale-recorded| MQ
  SALES -->|audit-log| MQ
  INV -->|stock-updated| MQ
  INV -->|fuel-price-updated| MQ

  MQ -->|sale-recorded| FRAUD
  FRAUD -->|fraud-alerts| MQ
  MQ -->|fraud-alerts| NOTIF
  MQ -->|stock-updated| NOTIF
  MQ -->|fuel-price-updated| NOTIF
  MQ -->|sale-recorded| NOTIF
  MQ -->|audit-log| AUD
```

---

## Tech stack

### Frontend
- Angular 17 + TypeScript + RxJS
- Angular Router (AuthGuard + RoleGuard)
- SCSS styling
- Leaflet (maps / nearby stations UX)
- jsPDF (PDF receipts in the UI)

### Backend
- .NET (`net10.0`) / ASP.NET Core
- API Gateway: Ocelot
- Data access: Entity Framework Core (services run `Database.Migrate()` on startup)
- Auth: JWT Bearer authentication + `[Authorize(Roles = ...)]`
- API docs: Swagger/OpenAPI for each service + the gateway
- Messaging: RabbitMQ.Client (simple queue-based pub/sub)
- Caching: StackExchange.Redis (Inventory, optional) + in-memory cache (Sales idempotency)
- Password hashing: BCrypt (Identity)

### Local/dev infrastructure
- Docker Compose
- SQL Server 2022 container (one server, multiple service databases)
- Redis 7 container (optional; Inventory degrades gracefully if unavailable)
- RabbitMQ 3 (management image)

### Optional external integrations
- Razorpay Orders API (create order + verify signature)
- Google Generative Language API (Gemini) for AI chat endpoint
- SMTP for OTP emails (Identity) and notification emails (Notification)

---

## Services (what each one owns)

When running with Docker Compose (backend), these host ports are exposed:

| Service | Port | Owns / does | Stores data in |
| --- | ---: | --- | --- |
| Gateway (Ocelot) | 5000 | Single entry point, routing, JWT validation, rate limiting, optional AI + payments endpoints | (none) |
| Identity | 5001 | Login/register, JWT issuing, user management, email OTP | FuelIdentityDb |
| Inventory | 5002 | Tanks, stock, alerts, replenishment orders, fuel pricing; publishes stock/price events | FuelInventoryDb |
| Sales | 5003 | Transactions + receipts, pumps; publishes sale + audit events; idempotency key support | FuelSalesDb |
| Reporting | 5004 | Read-optimized reports/aggregations | FuelReportingDb |
| Notification | 5005 | Consumes events, creates notification logs, price-drop subscriptions + email sending | FuelNotificationDb |
| FraudDetection | 5006 | Consumes sales events, evaluates fraud rules, stores fraud alerts; publishes fraud events | FuelFraudDb |
| Station | 5007 | Station directory, operating hours, nearby station search | FuelStationDb |
| Audit | 5008 | Consumes audit events and stores audit trail entries | FuelAuditDb |

Infrastructure:

- SQL Server: `localhost:1433`
- Redis: `localhost:6379`
- RabbitMQ: `localhost:5672` (AMQP), `localhost:15672` (Management UI)

---

## How the website works (end-to-end)

### 1) Login & role-based navigation

1. User logs in from the Angular app.
2. Angular calls the gateway: `POST http://localhost:5000/gateway/auth/login`.
3. Identity returns a JWT + user profile.
4. Angular stores the JWT in `localStorage` and adds `Authorization: Bearer <token>` via an HTTP interceptor.
5. Route guards enforce access:
   - **AuthGuard** blocks unauthenticated routes.
   - **RoleGuard** routes users to the correct dashboard (Admin/Dealer/Customer).

### 2) Dealer records a sale (and everything that happens after)

1. Dealer submits a sale form.
2. Angular calls: `POST /gateway/sales/transactions` (Gateway → Sales service).
3. Sales:
   - validates pump status
   - creates a transaction with a receipt number
   - supports idempotency via `Idempotency-Key` header (retries can return the existing transaction)
   - publishes two RabbitMQ messages:
     - queue `sale-recorded` (`SaleRecordedEvent`)
     - queue `audit-log` (`AuditEvent`)
4. Downstream consumers:
   - **FraudDetection** consumes `sale-recorded`, applies rules, stores fraud alerts, publishes `fraud-alerts`
   - **Notification** consumes `sale-recorded` and `fraud-alerts` and creates notification logs
   - **Audit** consumes `audit-log` and stores audit entries

### 3) Inventory updates → low stock alerts

1. Dealer/Admin updates tank fuel level: `PUT /gateway/inventory/tanks/{id}/level`.
2. Inventory updates the tank + alert states, then publishes `stock-updated`.
3. Notification consumes `stock-updated` and creates a low-stock alert notification when the new level goes below a threshold.

### 4) Fuel price updates → price drop subscriptions

1. Admin/Dealer updates price on a tank (`PUT /tanks/{id}/price`) or bulk by fuel type (`PUT /tanks/prices/bulk`).
2. Inventory publishes `fuel-price-updated`.
3. Notification checks active subscriptions and may send email + store a notification log.

### 5) Nearby stations (maps)

The Station service exposes `GET /api/stations/nearby?lat=...&lng=...&radiusKm=...` (Haversine distance), which is ideal for map-based “near me” experiences.

---

## API gateway routes (browser-facing)

The Angular app calls the gateway (default: `http://localhost:5000`). Ocelot proxies these route prefixes:

- `/gateway/auth/*` → Identity `/api/auth/*`
- `/gateway/users/*` → Identity `/api/users/*`
- `/gateway/inventory/tanks/*` → Inventory `/api/tanks/*`
- `/gateway/inventory/alerts/*` → Inventory `/api/alerts/*`
- `/gateway/inventory/replenishment/*` → Inventory `/api/replenishment/*`
- `/gateway/sales/transactions/*` → Sales `/api/transactions/*`
- `/gateway/sales/pumps/*` → Sales `/api/pumps/*`
- `/gateway/reporting/*` → Reporting `/api/reports/*`
- `/gateway/notifications/*` → Notification `/api/notifications/*`
- `/gateway/fraud/*` → FraudDetection `/api/fraud/*`
- `/gateway/stations/*` → Station `/api/stations/*`
- `/gateway/audit/*` → Audit `/api/audit/*`

The gateway also exposes **direct** endpoints (not proxied by Ocelot):

- `GET /healthz` and `GET /health`
- `POST /gateway/ai/chat` (optional; requires `AI_ASSISTANT_API_KEY`)
- `POST /gateway/payments/create-order` + `POST /gateway/payments/verify` (optional; requires Razorpay keys)

---

## Run it (quickstart)

The fastest local setup is:

1) Start backend + infra via Docker:

```powershell
docker compose up -d --build
```

2) Start the Angular app:

```powershell
cd frontend\fuel-management-web
npm install
npm start
```

Open:

- Frontend: `http://localhost:4200`
- Gateway Swagger: `http://localhost:5000/swagger`

Default dev users (seeded by the Identity service on first run):

- Admin: `admin@fuel.local` / `Admin@123`
- Dealer: `dealer@fuel.local` / `Dealer@123`
- Customer: `customer@fuel.local` / `Customer@123`

For details (including local backend runs without Docker), see [RUNNING.md](RUNNING.md).

---

## Configuration (.env)

Docker Compose reads a root `.env` file (gitignored). A template is provided:

- Copy `.env.example` → `.env`

Common variables:

- `MSSQL_SA_PASSWORD` (SQL Server container)
- `MAILSETTINGS__ENABLED`, `MAILSETTINGS__SMTPHOST`, `MAILSETTINGS__USERNAME`, `MAILSETTINGS__PASSWORD`, ... (OTP + emails)
- `AI_ASSISTANT_API_KEY` (enables `/gateway/ai/chat`)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (enables gateway payment helpers)

---

## Repo layout (where to look)

- `docker-compose.yml` – runs backend + infra locally
- `RUNNING.md` – step-by-step run instructions
- `frontend/fuel-management-web/` – Angular SPA
- `src/Gateway/FuelManagement.Gateway/` – API Gateway (Ocelot)
- `src/Services/*` – microservices (Identity, Sales, Inventory, etc.)
- `src/Shared/*` – shared libraries:
  - `FuelManagement.Common` (API defaults, middleware/helpers, RabbitMQ abstraction)
  - `FuelManagement.Contracts` (shared event contracts like `SaleRecordedEvent`, `StockUpdatedEvent`, ...)

