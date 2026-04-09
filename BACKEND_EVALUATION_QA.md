# Fuel Flow — Backend Evaluation Q&A

Use this file as a project-viva / interview prep sheet. Questions are phrased the way reviewers typically ask them, and answers are specific to this repo.

Related docs:

- Overview: [README.md](README.md)
- Deep dive: [PROJECT_GUIDE.md](PROJECT_GUIDE.md)
- How to run: [RUNNING.md](RUNNING.md)

---

## A) Architecture & design

### 1) What architecture does this project use?

**Answer:**

- A **microservices** backend with an **API Gateway** (Ocelot) in front.
- A mix of:
  - **Synchronous HTTP** calls (Angular → gateway → service)
  - **Asynchronous event-driven** processing (RabbitMQ queues)

### 2) Why microservices here instead of a monolith?

**Answer:**

- Clear **separation of concerns** (Identity vs Sales vs Inventory etc.).
- Each service can evolve independently and can be scaled independently.
- The project demonstrates real-world patterns: **service boundaries, distributed workflows, and event-driven reactions**.

### 3) What is the API Gateway and why do you need it?

**Answer:**

- The gateway is the **single entry point** for the frontend.
- It centralizes:
  - Routing to internal services (`/gateway/*`)
  - Cross-cutting policies (JWT validation + rate limiting)
  - Optional “edge” endpoints (AI + Razorpay helpers)

Implementation:

- Gateway: [src/Gateway/FuelManagement.Gateway/Program.cs](src/Gateway/FuelManagement.Gateway/Program.cs)
- Routes: [src/Gateway/FuelManagement.Gateway/ocelot.json](src/Gateway/FuelManagement.Gateway/ocelot.json)

### 4) How does Ocelot route requests?

**Answer:**

- Ocelot matches the **Upstream** route (`/gateway/...`) and forwards to the configured **Downstream** service (`/api/...`).
- Example: `/gateway/sales/transactions/*` → Sales service `/api/transactions/*`.

### 5) Where are the service boundaries in this repo?

**Answer:**

- Gateway: `src/Gateway/FuelManagement.Gateway`
- Services: `src/Services/*`
- Shared libraries:
  - `src/Shared/FuelManagement.Common` (middleware, defaults, messaging)
  - `src/Shared/FuelManagement.Contracts` (event contracts)

---

## B) RabbitMQ & event-driven design (most asked)

### 6) What is RabbitMQ?

**Answer:**

- RabbitMQ is a **message broker**.
- It allows services to communicate **asynchronously** by publishing messages to queues, which other services consume.
- This improves decoupling: the publisher doesn’t need to call the consumer directly.

### 7) Why did you use RabbitMQ in this project?

**Answer:**

To model real-world workflows where one action triggers multiple downstream effects:

- Record sale → audit log + fraud detection + notifications
- Update stock → low stock notifications
- Update fuel price → price-drop subscription notifications

### 8) Exactly how is RabbitMQ used in this repo?

**Answer:**

This project uses **queue-based pub/sub** using the RabbitMQ default exchange:

- Publishers call `PublishAsync(queueName, message)`
- Consumers call `SubscribeAsync<T>(queueName, handler)`

Code:

- Messaging wrapper: [src/Shared/FuelManagement.Common/Messaging/RabbitMqService.cs](src/Shared/FuelManagement.Common/Messaging/RabbitMqService.cs)
- Shared event types: [src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs](src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs)

### 9) What queues/events exist?

**Answer:**

- `sale-recorded` (SaleRecordedEvent)
- `audit-log` (AuditEvent)
- `stock-updated` (StockUpdatedEvent)
- `fuel-price-updated` (FuelPriceUpdatedEvent)
- `fraud-alerts` (FraudAlertEvent)

### 10) Which service publishes which events?

**Answer:**

- **Sales** publishes:
  - `sale-recorded`
  - `audit-log`

- **Inventory** publishes:
  - `stock-updated`
  - `fuel-price-updated`

- **FraudDetection** publishes:
  - `fraud-alerts`

### 11) Which service consumes which events?

**Answer:**

- **FraudDetection** consumes:
  - `sale-recorded`

- **Audit** consumes:
  - `audit-log`

- **Notification** consumes:
  - `stock-updated`
  - `sale-recorded`
  - `fraud-alerts`
  - `fuel-price-updated`

Code:

- Fraud consumer: [src/Services/FraudDetection/FuelManagement.FraudDetection.API/FraudDetectionBackgroundService.cs](src/Services/FraudDetection/FuelManagement.FraudDetection.API/FraudDetectionBackgroundService.cs)
- Audit consumer: [src/Services/Audit/FuelManagement.Audit.API/AuditBackgroundService.cs](src/Services/Audit/FuelManagement.Audit.API/AuditBackgroundService.cs)
- Notification consumers: [src/Services/Notification/FuelManagement.Notification.API/NotificationBackgroundService.cs](src/Services/Notification/FuelManagement.Notification.API/NotificationBackgroundService.cs)

### 12) Walk me through the “sale recorded” flow.

**Answer:**

1) Dealer posts a transaction (HTTP) to Sales.
2) Sales writes the transaction in SQL Server.
3) Sales publishes:
   - `sale-recorded` (for downstream processing)
   - `audit-log` (for audit trail)
4) FraudDetection consumes `sale-recorded` and may publish `fraud-alerts`.
5) Notification consumes both `sale-recorded` and `fraud-alerts`.
6) Audit consumes `audit-log` and stores an audit entry.

### 13) How do you ensure a message is not processed twice?

**Answer:**

- For HTTP writes, Sales supports **idempotency** (see question 35).
- For RabbitMQ processing, this repo uses **manual acknowledgments** (`BasicAck`) after handler completion.

Important note (evaluation-friendly):

- The current implementation does not include a retry/DLQ strategy. In production, you’d add **dead-letter queues**, backoff retries, and idempotent consumers.

### 14) Are messages durable/persistent here?

**Answer:**

- Queues are declared as **durable** (`durable: true`).
- Messages are published without explicitly setting persistent delivery mode.

For a production-hardening answer:

- You would set message properties (`DeliveryMode = 2`) and implement an **outbox pattern** to avoid losing events when the DB write succeeds but publish fails.

---

## C) Authentication, JWT, roles

### 15) How does authentication work end-to-end?

**Answer:**

- Identity service handles login/register/OTP.
- On login, Identity returns:
  - a JWT access token (short expiry)
  - a refresh token stored in an **HttpOnly cookie**
- Gateway and microservices validate JWT bearer tokens on each request.

Code:

- Identity auth endpoints: [src/Services/Identity/FuelManagement.Identity.API/Controllers/AuthController.cs](src/Services/Identity/FuelManagement.Identity.API/Controllers/AuthController.cs)

### 16) Where is role-based authorization implemented?

**Answer:**

- Backend uses `[Authorize(Roles = "...")]` on controllers/actions.
- Example: Sales transaction creation is restricted to Dealer/Admin.

### 17) How does refresh token work here?

**Answer:**

- Identity sets a `refreshToken` cookie:
  - `HttpOnly = true`
  - `Secure = true`
  - `SameSite = Strict`
- Client calls `POST /api/auth/refresh` to rotate refresh tokens and receive a new access token.

### 18) How are passwords stored?

**Answer:**

- Passwords are hashed using **BCrypt**.
- Login verifies the hash using `BCrypt.Verify(...)`.

### 19) What OTP flow exists?

**Answer:**

- Email OTP is supported for register + login flows:
  - `POST /api/auth/email-otp/send`
  - `POST /api/auth/email-otp/verify`
- Registration requires OTP consumption before creating the user.

---

## D) Data layer (SQL Server + EF Core)

### 20) What database is used?

**Answer:**

- SQL Server (containerized in local dev via Docker Compose).
- Each service uses its own database (FuelSalesDb, FuelInventoryDb, etc.).

### 21) How are database migrations applied?

**Answer:**

- Services call `db.Database.Migrate()` on startup.
- This auto-creates/updates schema during dev runs.

Evaluation point:

- Auto-migrate is convenient for demo/dev; for production you typically run migrations in CI/CD.

### 22) What ORM is used?

**Answer:**

- Entity Framework Core (SqlServer provider).

---

## E) Caching (Redis)

### 23) Why is Redis used?

**Answer:**

- To reduce repeated reads and speed up common list queries.

### 24) How is Redis used in this repo?

**Answer:**

- Inventory service caches tank list responses for ~5 minutes.
- If Redis is not available, Inventory continues without caching (graceful degradation).

Code:

- Inventory startup tries Redis connection: [src/Services/Inventory/FuelManagement.Inventory.API/Program.cs](src/Services/Inventory/FuelManagement.Inventory.API/Program.cs)
- Cache logic: [src/Services/Inventory/FuelManagement.Inventory.API/Controllers/InventoryControllers.cs](src/Services/Inventory/FuelManagement.Inventory.API/Controllers/InventoryControllers.cs)

---

## F) Reliability, observability, and middleware

### 25) How do you handle errors consistently across services?

**Answer:**

- Each service uses shared middleware:
  - `CorrelationIdMiddleware`
  - `GlobalExceptionMiddleware`
- Exceptions return a problem+json payload with trace/correlation id.

Code:

- Defaults: [src/Shared/FuelManagement.Common/Extensions/ApiDefaultsExtensions.cs](src/Shared/FuelManagement.Common/Extensions/ApiDefaultsExtensions.cs)
- Exception middleware: [src/Shared/FuelManagement.Common/Middleware/GlobalExceptionMiddleware.cs](src/Shared/FuelManagement.Common/Middleware/GlobalExceptionMiddleware.cs)
- Correlation id middleware: [src/Shared/FuelManagement.Common/Middleware/CorrelationIdMiddleware.cs](src/Shared/FuelManagement.Common/Middleware/CorrelationIdMiddleware.cs)

### 26) What is a correlation ID and how is it implemented here?

**Answer:**

- A correlation ID is a request identifier used to trace logs across services.
- This repo uses `X-Correlation-ID`:
  - If the client sends it, the server uses it.
  - Otherwise the server generates one.
  - It is added to the response headers.

### 27) How do you check service health?

**Answer:**

- Each service exposes `GET /healthz`.
- Gateway exposes `GET /healthz` and `GET /health`.

---

## G) Deployment & configuration

### 28) How do you run the system locally?

**Answer:**

- Backend + infra via Docker Compose.
- Frontend runs with Angular dev server.

Details: [RUNNING.md](RUNNING.md)

### 29) How is configuration managed?

**Answer:**

- Docker Compose reads `.env` (template: `.env.example`).
- Services use environment variables for connection strings and optional integrations.
- Gateway also uses an env var to choose routing file: `OCELOT_FILE`.

### 30) What optional integrations exist and where?

**Answer:**

- Gateway Razorpay endpoints:
  - `POST /gateway/payments/create-order`
  - `POST /gateway/payments/verify`

- Gateway AI assistant endpoint:
  - `POST /gateway/ai/chat`

Code:

- [src/Gateway/FuelManagement.Gateway/Program.cs](src/Gateway/FuelManagement.Gateway/Program.cs)

---

## H) “Hard” questions (great answers for evaluators)

### 31) What are the biggest production gaps you would fix first?

**Answer (good engineering answer):**

- Add message reliability patterns:
  - Outbox pattern for publish-after-commit
  - Retry + backoff + dead-letter queues (DLQ)
- Add centralized logging/metrics/tracing (OpenTelemetry)
- Replace in-memory idempotency cache with a shared store (Redis/DB) so it survives restarts
- Tighten CORS and cookie security settings for real deployments

### 32) What is eventual consistency and where does it appear in this project?

**Answer:**

- With RabbitMQ, downstream services (Fraud/Audit/Notification) update state **after** the original write.
- That means the UI may see the transaction immediately, while alerts/notifications appear slightly later.

### 33) How would you add a new microservice?

**Answer:**

1) Create the new ASP.NET service under `src/Services/<NewService>`.
2) Add its Dockerfile and add it to `docker-compose.yml`.
3) Add an Ocelot route prefix under `/gateway/<new>/*` in both:
   - `ocelot.json`
   - `ocelot.docker.json`
4) Add shared contracts/events in `FuelManagement.Contracts` if needed.

### 34) How would you add a new event?

**Answer:**

1) Add a new record type in [src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs](src/Shared/FuelManagement.Contracts/Events/DomainEvents.cs).
2) Publish it from the producer service using `PublishAsync("queue-name", evt)`.
3) Subscribe in consumer services using `SubscribeAsync<YourEvent>("queue-name", handler)`.
4) Ensure handlers are idempotent and safe to retry.

---

## Extra evaluator questions (very common)

### 35) What is idempotency and how is it implemented in this project?

**Answer:**

- **Idempotency** means “retrying the same request does not create duplicate effects.”
- In Fuel Flow, Sales transaction creation supports an idempotency key so clients can safely retry on timeouts.

How it works here:

- The client can send the header `Idempotency-Key: <any unique string>` when creating a transaction.
- Sales builds a cache key using the logged-in user id + idempotency key.
- If the same key is seen again within ~10 minutes, Sales returns the already-created transaction instead of inserting a new one.

Code:

- [src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs](src/Services/Sales/FuelManagement.Sales.API/Controllers/SalesControllers.cs)

Limitations (good to mention in evaluation):

- It uses **in-memory cache**, so it does not survive service restarts and is not shared across multiple instances.
- A production version would store idempotency state in Redis/DB.

### 36) Where is rate limiting configured and what does it do?

**Answer:**

- Rate limiting is configured at the **API Gateway** level using Ocelot `RateLimitOptions`.
- This protects internal services from accidental flooding and also demonstrates an “edge policy” handled once at the gateway.

Code/config:

- [src/Gateway/FuelManagement.Gateway/ocelot.json](src/Gateway/FuelManagement.Gateway/ocelot.json)

Example behavior:

- Certain route prefixes (like users/transactions/tanks) have per-minute quotas.
- If the limit is exceeded, gateway responds with HTTP `429`.

## Quick “RabbitMQ answer” (one-liner)

If an evaluator asks only one question and expects one sentence:

- “RabbitMQ is the message broker we use for asynchronous communication; in Fuel Flow we publish domain events like `sale-recorded` and `stock-updated` from Sales/Inventory, and Fraud/Notification/Audit consume them via background services to create fraud alerts, notifications, and audit logs without coupling services via direct HTTP calls.”
