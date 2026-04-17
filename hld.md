# Fuel Flow - High-Level Design (HLD)

Version: 1.0  
Date: 2026-04-17  
System: Fuel Flow (Angular SPA + .NET microservices)

## 1. Purpose

This document defines the high-level architecture for Fuel Flow, a role-based fuel management platform with the following business goals:

1. Provide a single operational platform for Admin, Dealer, and Customer personas.
2. Support core fuel operations: stations, inventory, sales, reporting, fraud monitoring, notifications, and auditing.
3. Maintain clear service ownership and extensibility using microservices and asynchronous event-driven workflows.

## 2. Scope

### In Scope

1. Angular web application and role-based UI modules.
2. API Gateway and 8 backend microservices.
3. SQL Server, RabbitMQ, and Redis integration.
4. Public contact flow, optional AI helper, and optional payment helper endpoints.

### Out of Scope

1. Native mobile clients.
2. Multi-region production deployment automation.
3. Enterprise IAM federation (SAML/OIDC providers).

## 3. Stakeholders and Actors

1. Admin: user governance, fraud, reports, stations, pricing oversight.
2. Dealer: sales entry, inventory updates, pump operations, shift operations.
3. Customer: order tracking, price visibility, receipts, nearby stations.
4. Platform Ops: deployment, monitoring, infrastructure operations.

## 4. Architectural Drivers

### Functional Drivers

1. JWT authentication with role-based authorization.
2. Sale and inventory updates with event fan-out to fraud, notification, and audit domains.
3. Reporting document generation (PDF/Excel) and download.
4. Public contact form mail dispatch path.

### Non-Functional Drivers

1. Scalability: service-level horizontal scaling behind API Gateway.
2. Reliability: asynchronous decoupling through RabbitMQ.
3. Security: role checks at API level + token-based access.
4. Maintainability: bounded microservice ownership and shared contracts.
5. Observability: health endpoints, correlation IDs, structured logs.

## 5. System Context View

Diagram note: all diagrams are top-down and split into smaller views to keep page width compact.

```mermaid
%%{init: {'theme': 'neutral', 'flowchart': {'curve': 'linear'}}}%%
flowchart TD
  U[Users\nAdmin Dealer Customer]
  SPA[Angular SPA\nPort 4200]
  GW[API Gateway\nOcelot Port 5000]
  SVC[Backend Service Cluster\nIdentity Inventory Sales\nReporting Notification Fraud\nStation Audit]
  SQL[(SQL Server)]
  MQ[(RabbitMQ)]
  REDIS[(Redis Optional)]
  EXT[External APIs\nGemini Razorpay SMTP]

  U --> SPA
  SPA --> GW
  GW --> SVC
  SVC --> SQL
  SVC --> MQ
  SVC --> REDIS
  GW --> EXT
  SVC --> EXT
```

## 6. Container View

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
  subgraph Frontend
    FE[Angular Web App]
  end

  subgraph Edge
    APIGW[Gateway\nOcelot + Direct Endpoints]
  end

  subgraph DomainServices
    ID[Identity]
    INV[Inventory]
    SAL[Sales]
    REP[Reporting]
    NOTI[Notification]
    FRD[FraudDetection]
    STN[Station]
    AUD[Audit]
  end

  subgraph DataInfra
    DB[(SQL Server\nService DBs)]
    BUS[(RabbitMQ)]
    RC[(Redis Optional)]
  end

  FE --> APIGW
  APIGW --> ID
  APIGW --> INV
  APIGW --> SAL
  APIGW --> REP
  APIGW --> NOTI
  APIGW --> FRD
  APIGW --> STN
  APIGW --> AUD

  ID --> DB
  INV --> DB
  SAL --> DB
  REP --> DB
  NOTI --> DB
  FRD --> DB
  STN --> DB
  AUD --> DB

  INV --> RC

  INV --> BUS
  SAL --> BUS
  BUS --> NOTI
  BUS --> FRD
  BUS --> AUD
  FRD --> BUS
```

## 7. Bounded Contexts and Ownership

| Service | Bounded Context | Key Responsibility |
| --- | --- | --- |
| Identity | Access & Identity | Auth, OTP, tokens, user profile and role management |
| Inventory | Tank & Stock | Fuel tanks, stock alerts, replenishment, pricing |
| Sales | Transaction Ops | Sales transactions, receipts, pump management, idempotent create |
| Reporting | Analytics Output | Report request lifecycle, file generation, downloads |
| Notification | User Communication | Event-driven alerts, price-drop subscriptions, contact form mail |
| FraudDetection | Risk Control | Rule-based fraud analysis and alert generation |
| Station | Station Registry | Station master data, hours, nearby station search |
| Audit | Compliance Trail | Immutable-style audit log ingestion and querying |

## 8. Integration View

### 8.1 Synchronous Request Pattern

1. Browser calls only `/gateway/*`.
2. Ocelot routes request to target downstream service.
3. Service validates JWT/roles, executes domain logic, persists data.
4. Response returns via gateway to client.

### 8.2 Asynchronous Event Pattern

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
  SAL[Sales Service] -->|sale-recorded| MQ[(RabbitMQ)]
  SAL -->|audit-log| MQ
  INV[Inventory Service] -->|stock-updated| MQ
  INV -->|fuel-price-updated| MQ

  MQ --> FRD[FraudDetection]
  FRD -->|fraud-alerts| MQ

  MQ --> NOTI[Notification]
  MQ --> AUD[Audit]
```

## 9. High-Level Deployment View

```mermaid
%%{init: {'theme': 'neutral'}}%%
flowchart TD
  DEV[Developer Browser]

  subgraph HostMachine
    SPA4200[Angular Dev Server\n:4200]

    subgraph DockerCompose
      GW5000[Gateway :5000]
      ID5001[Identity :5001]
      INV5002[Inventory :5002]
      SAL5003[Sales :5003]
      REP5004[Reporting :5004]
      NOT5005[Notification :5005]
      FRD5006[Fraud :5006]
      STN5007[Station :5007]
      AUD5008[Audit :5008]
      SQL1433[SQL Server :1433]
      RB5672[RabbitMQ :5672]
      RM15672[RabbitMQ UI :15672]
      RED6379[Redis :6379]
    end
  end

  DEV --> SPA4200
  SPA4200 --> GW5000
  GW5000 --> ID5001
  GW5000 --> INV5002
  GW5000 --> SAL5003
  GW5000 --> REP5004
  GW5000 --> NOT5005
  GW5000 --> FRD5006
  GW5000 --> STN5007
  GW5000 --> AUD5008

  ID5001 --> SQL1433
  INV5002 --> SQL1433
  SAL5003 --> SQL1433
  REP5004 --> SQL1433
  NOT5005 --> SQL1433
  FRD5006 --> SQL1433
  STN5007 --> SQL1433
  AUD5008 --> SQL1433

  INV5002 --> RED6379
  INV5002 --> RB5672
  SAL5003 --> RB5672
  FRD5006 --> RB5672
  NOT5005 --> RB5672
  AUD5008 --> RB5672
```

## 10. Security View

1. JWT Bearer token validation at Gateway and service boundaries.
2. Role enforcement (`Admin`, `Dealer`, `Customer`) in controllers and Angular route guards.
3. Public anonymous surfaces restricted to specific endpoints only (for example contact form, selected station reads).
4. Correlation ID middleware for request traceability.

## 11. Reliability and Resilience View

1. Event-driven decoupling for fraud/notification/audit side effects.
2. Sales write idempotency via `Idempotency-Key` + in-memory cache window.
3. Inventory read cache via Redis (graceful fallback if Redis is unavailable).
4. Notification startup/consumer logic hardened to tolerate infra dependency outages.

## 12. Scalability Strategy

1. Stateless APIs allow horizontal scaling per service.
2. API Gateway centralizes edge concerns (route, rate-limit, auth pre-check).
3. Queue-based processing supports burst smoothing and asynchronous throughput.
4. Service-specific data stores reduce cross-domain lock contention.

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| RabbitMQ outage | Delayed downstream alerts/audit/fraud processing | Durable queues, startup tolerance, retry/recovery operations |
| SQL Server unavailability | Service write/read failure | Health checks, startup migration controls, backup/restore procedures |
| External API quota limits (AI) | AI helper degradation | Fallback replies and configurable model/key settings |
| Shared host resource saturation | Latency spikes | Service-level scaling, resource limits, performance monitoring |

## 14. Architecture Decisions Summary

1. Microservices over monolith to isolate ownership and enable independent evolution.
2. Ocelot gateway as single browser entry point for route and policy centralization.
3. RabbitMQ event model for cross-domain side effects and temporal decoupling.
4. SQL-per-service boundary for domain autonomy and clearer ownership.
5. Optional Redis cache in inventory path to improve frequent read response times.
