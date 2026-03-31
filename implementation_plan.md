# Indian Fuel Management System — Backend Implementation Plan

## Overview

Build a complete **ASP.NET Core 8** microservices backend from scratch in `c:\Users\Arjun\Desktop\sprintproj`. The solution follows the PRD specification with 8 microservices, an Ocelot API Gateway, SQL Server (one DB per service), Redis caching, RabbitMQ messaging, and Swagger on every service.

> [!IMPORTANT]
> This is a greenfield project. The workspace is currently empty. All services will be scaffolded, configured, and documented.

---

## Solution Structure

```
sprintproj/
├── FuelManagement.sln
├── docker-compose.yml                    # SQL Server, Redis, RabbitMQ
├── src/
│   ├── Gateway/                          # Ocelot API Gateway
│   ├── Services/
│   │   ├── Identity/                     # Port 5001
│   │   ├── Inventory/                    # Port 5002
│   │   ├── Sales/                        # Port 5003
│   │   ├── Reporting/                    # Port 5004
│   │   ├── Notification/                 # Port 5005
│   │   ├── FraudDetection/              # Port 5006
│   │   ├── Station/                      # Port 5007
│   │   └── Audit/                        # Port 5008
│   └── Shared/
│       ├── FuelManagement.Common/        # Shared DTOs, base classes
│       └── FuelManagement.Contracts/     # RabbitMQ event contracts
```

---

## Proposed Changes

### Shared Libraries

#### [NEW] FuelManagement.Common
- `BaseEntity.cs` — Id, CreatedAt, UpdatedAt
- `PagedResult<T>.cs` — pagination wrapper
- `ApiResponse<T>.cs` — uniform response envelope
- `JwtSettings.cs` — shared JWT configuration model

#### [NEW] FuelManagement.Contracts
- RabbitMQ event DTOs: `StockUpdatedEvent`, `SaleRecordedEvent`, `FraudAlertEvent`, `AuditEvent`

---

### Identity Service (Port 5001)

**DB: `FuelIdentityDb`**

**Entities:** `ApplicationUser` (Id, Email, PasswordHash, Role, FullName, Phone, StationId?, CreatedAt, IsActive), `RefreshToken` (Id, UserId, Token, ExpiresAt, IsRevoked)

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT + refresh token cookie |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/users` | List users (Admin) |
| GET | `/api/users/{id}` | Get user (Admin/self) |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Deactivate user (Admin) |
| PUT | `/api/users/{id}/role` | Change role (Admin) |

**Key impl details:** BCrypt hashing, JWT (15 min access), HttpOnly cookie refresh token (7 day), `[Authorize(Roles="Admin")]` policies.

---

### Inventory Service (Port 5002)

**DB: `FuelInventoryDb`**

**Entities:** `FuelTank` (Id, StationId, FuelType, Capacity, CurrentLevel, LastUpdated), `StockAlert` (Id, TankId, AlertType, Threshold, IsActive), `ReplenishmentOrder` (Id, TankId, Quantity, OrderedAt, Status)

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tanks` | List all tanks |
| GET | `/api/tanks/{id}` | Get tank details |
| POST | `/api/tanks` | Add tank (Admin) |
| PUT | `/api/tanks/{id}/level` | Update fuel level (Dealer) |
| POST | `/api/replenishment` | Create replenishment order |
| GET | `/api/alerts` | Get active alerts |
| POST | `/api/alerts` | Create stock alert |

Publishes `StockUpdatedEvent` to RabbitMQ. Redis caches stock summaries (5 min TTL).

---

### Sales Service (Port 5003)

**DB: `FuelSalesDb`**

**Entities:** `Transaction` (Id, StationId, PumpId, FuelType, Quantity, UnitPrice, TotalAmount, PaymentMethod, Status, CustomerId?, CreatedAt), `Pump` (Id, StationId, FuelType, IsActive, LastMaintenance)

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/transactions` | Record new sale (Dealer) |
| GET | `/api/transactions` | List transactions (filtered) |
| GET | `/api/transactions/{id}` | Get transaction |
| GET | `/api/transactions/station/{stationId}` | Station transactions |
| GET | `/api/pumps` | List pumps |
| POST | `/api/pumps` | Add pump (Admin) |
| PUT | `/api/pumps/{id}` | Update pump status |

Publishes `SaleRecordedEvent` to RabbitMQ.

---

### Reporting Service (Port 5004)

**DB: `FuelReportingDb`**

**Entities:** `Report` (Id, ReportType, GeneratedAt, FilePath, Parameters, Status)

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/reports/sales` | Sales analytics (date range, station) |
| GET | `/api/reports/inventory` | Inventory analytics |
| POST | `/api/reports/generate` | Generate PDF/Excel report |
| GET | `/api/reports/{id}/download` | Download report file |
| GET | `/api/reports/dashboard` | Dashboard KPIs |

Uses **EPPlus** for Excel, **iText7** for PDF. Hangfire for scheduled report generation.

---

### Notification Service (Port 5005)

**DB: `FuelNotificationDb`**

**Entities:** `NotificationLog` (Id, RecipientId, Channel, Message, Status, SentAt)

RabbitMQ consumer for `StockUpdatedEvent`, `SaleRecordedEvent`, `FraudAlertEvent`.

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/notifications/send` | Manual send |
| GET | `/api/notifications/logs` | Notification history |

Channels: Email (SMTP stub), SMS (Twilio stub), Push (stub).

---

### Fraud Detection Service (Port 5006)

**DB: `FuelFraudDb`**

**Entities:** `FraudAlert` (Id, TransactionId, AlertType, Severity, Description, DetectedAt, IsResolved), `FraudRule` (Id, RuleName, Threshold, IsActive)

RabbitMQ consumer for `SaleRecordedEvent`.

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/fraud/alerts` | List fraud alerts (Admin) |
| PUT | `/api/fraud/alerts/{id}/resolve` | Resolve alert |
| GET | `/api/fraud/rules` | List detection rules |
| POST | `/api/fraud/rules` | Create rule |

Rule-based anomaly detection: high quantity in short time, after-hours sales, price deviation.

---

### Station Service (Port 5007)

**DB: `FuelStationDb`**

**Entities:** `Station` (Id, Name, DealerId, Address, City, State, Latitude, Longitude, IsActive), `OperatingHours` (Id, StationId, DayOfWeek, OpenTime, CloseTime)

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/stations` | List all stations |
| GET | `/api/stations/{id}` | Get station |
| POST | `/api/stations` | Create station (Admin) |
| PUT | `/api/stations/{id}` | Update station |
| DELETE | `/api/stations/{id}` | Deactivate station |
| GET | `/api/stations/nearby` | Find nearby stations (lat/lng) |
| PUT | `/api/stations/{id}/hours` | Set operating hours |

---

### Audit Service (Port 5008)

**DB: `FuelAuditDb`**

**Entities:** `AuditLog` (Id, EventType, EntityType, EntityId, UserId, OldValues, NewValues, Timestamp, ServiceName) — **append-only, no updates/deletes**

RabbitMQ consumer for `AuditEvent` from all services.

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/audit/logs` | Query audit trail (Admin, filterable) |
| GET | `/api/audit/logs/{entityId}` | Audit history for entity |

---

### API Gateway (Ocelot) — Port 5000

- Routes all `/gateway/{service}/*` requests to the appropriate microservice
- JWT validation at gateway level
- Rate limiting: 100 req/min per IP
- Swagger aggregation via `MMLib.SwaggerForOcelot`

---

### Infrastructure

#### [NEW] docker-compose.yml
- **SQL Server 2022** — port 1433
- **Redis** — port 6379
- **RabbitMQ** — ports 5672, 15672 (management UI)

---

## Verification Plan

### Automated (Swagger UI per service)
Each service exposes Swagger at `http://localhost:{port}/swagger`. After running:

```powershell
# From each service directory
dotnet run
```

Navigate to `http://localhost:5001/swagger` through `http://localhost:5008/swagger` and the Gateway at `http://localhost:5000/swagger`.

### Manual Test Flow
1. **Register** — `POST /gateway/auth/register` with Customer role
2. **Login** — `POST /gateway/auth/login` → copy JWT
3. **Authorize** in Swagger UI (Bearer token)
4. **Create Station** — `POST /gateway/stations` (Admin token)
5. **Update Tank Level** — `PUT /gateway/inventory/tanks/{id}/level`
6. **Record Sale** — `POST /gateway/sales/transactions`
7. **Generate Report** — `POST /gateway/reporting/reports/generate`
8. **Check Audit Log** — `GET /gateway/audit/logs`
9. **Check Fraud Alerts** — `GET /gateway/fraud/alerts`
