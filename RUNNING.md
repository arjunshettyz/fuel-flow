# Running Fuel Flow (FuelManagement)

This repo contains:
- **Frontend**: Angular SPA (runs on `http://localhost:4200`)
- **Backend**: .NET microservices + an Ocelot API Gateway
- **Infra**: SQL Server, Redis, RabbitMQ (via Docker Compose)

If you just want it working fast on Windows, run **backend in Docker** and **frontend locally**.

---

## Prerequisites

- **Docker Desktop** (WSL2 backend recommended)
- **Node.js 18+** and **npm**
- Optional (only if running backend locally): **.NET SDK 10.0**

---

## 1) Configure environment (.env)

Docker Compose references a root `.env` file (it is gitignored). Create it like this:

1. Copy the template:
   - Copy `.env.example` → `.env`
2. Fill in values you need.

Notes:
- For basic local/dev runs, most variables are optional.
- **Never commit real secrets**. If any keys/passwords were ever shared publicly, rotate them.

---

## 2) Start the backend (Docker)

From the repo root:

```powershell
docker compose up -d --build
```

Check containers:

```powershell
docker compose ps
```

Useful URLs (host machine):
- **API Gateway Swagger**: `http://localhost:5000/swagger`
- **API Gateway Health**: `http://localhost:5000/healthz`
- RabbitMQ Management UI: `http://localhost:15672` (user/pass: `guest` / `guest`)

Service Swagger UIs (each service runs its own Swagger):
- Identity: `http://localhost:5001/swagger`
- Inventory: `http://localhost:5002/swagger`
- Sales: `http://localhost:5003/swagger`
- Reporting: `http://localhost:5004/swagger`
- Notification: `http://localhost:5005/swagger`
- FraudDetection: `http://localhost:5006/swagger`
- Station: `http://localhost:5007/swagger`
- Audit: `http://localhost:5008/swagger`

### Default dev users
The Identity service seeds these users on first startup:
- Admin: `admin@fuel.local` / `Admin@123`
- Dealer: `dealer@fuel.local` / `Dealer@123`
- Customer: `customer@fuel.local` / `Customer@123`

---

## 3) Start the frontend (local)

In a new terminal:

```powershell
cd frontend\fuel-management-web
npm install
npm start
```

Open:
- `http://localhost:4200/`

The frontend calls the gateway using:
- `environment.apiBaseUrl` in `frontend/fuel-management-web/src/environments/environment.ts`
  - default: `http://localhost:5000`

---

## Stop / reset

Stop containers:

```powershell
docker compose down
```

Full reset (deletes DB + Redis + RabbitMQ volumes):

```powershell
docker compose down -v
```

---

## Run backend locally (without Docker for the APIs)

### Option A (recommended): run only infra in Docker

Start infra services:

```powershell
docker compose up -d sqlserver redis rabbitmq
```

Then run each .NET service in its own terminal.

**Important:** checked-in `appsettings.json` files point to a local `SQLEXPRESS` instance.
If you want local services to use the Docker SQL Server (`localhost,1433`), override connection strings via environment variables.

Example (PowerShell):

```powershell
$env:MSSQL_SA_PASSWORD = "FuelFlow_SA_Password!123"
$cs = "Server=localhost,1433;Database=FuelIdentityDb;User Id=sa;Password=$env:MSSQL_SA_PASSWORD;TrustServerCertificate=True;Encrypt=False;"
$env:ConnectionStrings__IdentityDb = $cs

dotnet run --project src\Services\Identity\FuelManagement.Identity.API\FuelManagement.Identity.API.csproj
```

Do the same pattern for other services (`InventoryDb`, `SalesDb`, etc.).

### Gateway routing file
- Local run: Gateway defaults to `ocelot.json` (routes to `localhost:5001..5008`)
- Docker run: Compose sets `OCELOT_FILE=ocelot.docker.json` (routes to container names)

---

## Troubleshooting

- **SQL Server container won’t start**: your `MSSQL_SA_PASSWORD` must meet SQL Server complexity rules (length + upper/lower/digit/symbol).
- **Ports already in use**: backend uses `5000-5008`, infra uses `1433`, `6379`, `5672`, `15672`.
- **First run is slow**: services run EF Core migrations on startup.
- **See logs**:

```powershell
docker compose logs -f gateway
```

(Replace `gateway` with `identity`, `inventory`, etc.)

---

## Email (OTP + Price Drop Alerts)

Both the **Identity** service (OTP emails) and the **Notification** service (Price Drop Alert confirmation + alerts) use the same `MailSettings` configuration.

1) Copy `.env.example` → `.env`
2) Set these values in `.env`:

```env
MAILSETTINGS__ENABLED=true
MAILSETTINGS__SMTPHOST=<your_smtp_host>
MAILSETTINGS__SMTPPORT=587
MAILSETTINGS__USESSL=true
MAILSETTINGS__USERNAME=<smtp_username>
MAILSETTINGS__PASSWORD=<smtp_password>
MAILSETTINGS__FROMEMAIL=<from_email>
MAILSETTINGS__FROMNAME=Fuel Flow
```

Then rebuild/restart containers:

```powershell
docker compose up -d --build
```
