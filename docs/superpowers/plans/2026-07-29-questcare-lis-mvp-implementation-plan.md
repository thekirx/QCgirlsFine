# Questcare Offline LIS MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a testable offline-first LIS MVP covering patient registration through result release, a reproducible report, complete auditability, and a fault-isolated analyzer simulator and gateway.

**Architecture:** A Next.js modular monolith owns the UI, Route Handler APIs, business rules, authentication, reporting, audit, and PostgreSQL domain data through Prisma. A separate TypeScript analyzer gateway is a long-running process that implements a language-neutral adapter contract and communicates only through authenticated LIS APIs. Gateway failure never blocks manual LIS operation.

**Tech Stack:** Node.js 24 LTS, pnpm workspaces, Next.js App Router, React, strict TypeScript, PostgreSQL 18, Prisma ORM, Zod, Argon2id, Vitest, Playwright, PowerShell, and WinSW for production Windows services.

## Global Constraints

- Next.js is the only main LIS application and business API.
- Do not introduce Fastify, NestJS, or another general-purpose backend.
- Use thin Route Handlers, service modules for business rules, repositories for Prisma access, and shared Zod schemas.
- The analyzer gateway is a separate long-running service and never writes directly to patient, order, result, report, or audit tables.
- Core LIS operation must continue if the gateway is stopped or unreachable.
- Audit records and sensitive domain mutations commit in the same PostgreSQL transaction.
- HTTP is permitted during development. Local HTTPS is mandatory and documented before production go-live.
- Physical analyzer protocols, production ASTM/HL7 parsers, and bidirectional host query are outside the MVP.
- Production operation must not require Docker.
- Every milestone ends with automated tests, verification evidence, and a reviewable commit.
- No implementation begins until Optrizo approves this plan.

---

## 1. Final Monorepo and Folder Structure

```text
questcare-lis/
├── apps/
│   ├── lis/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/login/page.tsx
│   │   │   │   ├── (protected)/layout.tsx
│   │   │   │   ├── (protected)/patients/
│   │   │   │   ├── (protected)/orders/
│   │   │   │   ├── (protected)/queue/
│   │   │   │   ├── (protected)/results/
│   │   │   │   ├── (protected)/analyzers/
│   │   │   │   ├── (protected)/admin/
│   │   │   │   ├── api/auth/
│   │   │   │   ├── api/patients/
│   │   │   │   ├── api/orders/
│   │   │   │   ├── api/queue/
│   │   │   │   ├── api/results/
│   │   │   │   ├── api/reports/
│   │   │   │   ├── api/gateway/v1/health/route.ts
│   │   │   │   ├── api/gateway/v1/messages/route.ts
│   │   │   │   ├── api/gateway/v1/replay-jobs/route.ts
│   │   │   │   └── api/health/route.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/{schema,policy,service,repository}.ts
│   │   │   │   ├── users/{schema,policy,service,repository}.ts
│   │   │   │   ├── patients/{schema,policy,service,repository}.ts
│   │   │   │   ├── orders/{schema,policy,service,repository}.ts
│   │   │   │   ├── queue/{schema,service,repository}.ts
│   │   │   │   ├── results/{schema,policy,service,repository,state-machine}.ts
│   │   │   │   ├── reports/{schema,policy,service,repository,renderer}.ts
│   │   │   │   ├── analyzers/{schema,policy,service,repository,matcher}.ts
│   │   │   │   └── audit/{schema,service,repository}.ts
│   │   │   ├── server/
│   │   │   │   ├── db/{client,transaction}.ts
│   │   │   │   ├── auth/{cookies,password,session}.ts
│   │   │   │   ├── http/{errors,response}.ts
│   │   │   │   ├── security/{csrf,gateway-auth}.ts
│   │   │   │   └── observability/{logger,redaction}.ts
│   │   │   └── test/{factories,fixtures,test-db}.ts
│   │   ├── tests/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── next.config.ts
│   │   ├── playwright.config.ts
│   │   ├── prisma.config.ts
│   │   ├── vitest.config.ts
│   │   └── package.json
│   └── analyzer-gateway/
│       ├── src/
│       │   ├── adapters/simulator/{adapter,fixtures}.ts
│       │   ├── contract/{adapter,normalized-message}.ts
│       │   ├── core/{gateway,connection-manager,retry-policy}.ts
│       │   ├── delivery/{lis-client,outbox,dead-letter}.ts
│       │   ├── security/{credential,redaction}.ts
│       │   ├── storage/{store,file-store}.ts
│       │   └── main.ts
│       ├── tests/{contract,integration}.test.ts
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
├── packages/
│   ├── analyzer-contracts/
│   │   ├── src/{envelope,response,replay,health,index}.ts
│   │   └── package.json
│   ├── test-data/
│   │   ├── src/{patients,tests,analyzer-messages}.ts
│   │   └── package.json
│   └── typescript-config/{base,nextjs,node}.json
├── scripts/
│   ├── windows/{package-release,install-services,uninstall-services,backup,restore}.ps1
│   ├── capacity/run-capacity.ts
│   └── evidence/collect-test-evidence.ps1
├── deploy/windows/
│   ├── lis-service.xml
│   ├── gateway-service.xml
│   ├── caddy-service.xml
│   └── Caddyfile
├── docs/
│   ├── architecture/
│   ├── operations/
│   ├── security/
│   ├── test-evidence/
│   └── superpowers/{specs,plans}/
├── .env.example
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.json
```

The gateway's durable operational queue uses atomic files under `%ProgramData%\QuestcareLIS\gateway\spool`. This avoids adding a second database and allows the gateway to retain messages while the LIS API is unavailable. Domain data remains exclusively in PostgreSQL.

## 2. Database Entities and Relationships

All IDs use UUIDv7-compatible strings generated by the application. Human identifiers such as patient number and accession number are separate unique fields.

| Entity | Purpose and essential fields | Relationships and constraints |
|---|---|---|
| `User` | username, displayName, passwordHash, active, failedAttempts, lockedUntil | many-to-many `Role`; username unique |
| `Role` | code, name | many-to-many `Permission`; seeded ADMINISTRATOR, REGISTRATION, LABORATORY_USER, VALIDATOR |
| `Permission` | code, description | unique code; assigned through `RolePermission` |
| `UserRole` / `RolePermission` | authorization joins | composite unique keys |
| `Session` | tokenHash, userId, expiresAt, lastSeenAt, revokedAt | token hash unique; delete/expire independently of user history |
| `Patient` | patientNumber, names, birthDate, sex, contact fields, version | patientNumber unique; optimistic version increments on edit |
| `PatientDuplicateCandidate` | patientId, candidateId, rule, status | warning only; no merge in MVP |
| `TestDefinition` | code, name, valueType, unit, decimalPlaces, active | code unique; has ranges and qualitative choices |
| `ReferenceRange` | testDefinitionId, sex, minAgeDays, maxAgeDays, low, high, text | non-overlap enforced in service validation |
| `QualitativeOption` | testDefinitionId, code, label, abnormalFlag | composite unique test/code |
| `LabOrder` | accessionNumber, patientId, priority, source, status, cancellationReason | accession unique; belongs to patient; owns tests/specimen/result set |
| `OrderTest` | orderId, testDefinitionId, sequence, required | composite unique order/test |
| `Specimen` | orderId, sampleId, type, status | sampleId unique when present; one primary specimen per MVP order |
| `ResultSet` | orderId, status, submittedAt, validatedAt, releasedAt | one-to-one order; controls workflow state |
| `Result` | resultSetId, orderTestId, valueType, numericValue, textValue, qualitativeCode, unit, rangeText, abnormalFlag, source, version | one current result per order test; typed-value check constraint |
| `ResultRevision` | resultId, version, complete snapshot, actorId, source | append-only history; composite unique result/version |
| `ReportSnapshot` | orderId, reportNumber, mimeType, sha256, bytes, releasedAt | immutable; reportNumber and sha256 indexed |
| `AuditEvent` | actorType, actorId, action, entityType, entityId, beforeJson, afterJson, occurredAt, requestId, workstation | append-only; no update/delete application methods |
| `AnalyzerConnection` | code, name, adapterType, enabled, status, lastSeenAt | connection code unique |
| `GatewayCredential` | connectionScope, tokenHash, active, rotatedAt | hash only; never return stored secret |
| `AnalyzerMessage` | gatewayMessageId, connectionId, idempotencyKey, rawSha256, rawPayload, normalizedJson, status, receivedAt | unique connection/idempotencyKey; raw payload access restricted |
| `AnalyzerResultItem` | analyzerMessageId, analyzerTestCode, matchedOrderTestId, value snapshot, disposition | unique message/itemIndex |
| `AnalyzerException` | analyzerMessageId, type, status, reason, resolvedBy, resolvedAt | one active exception per message; resolution audited |
| `ReplayJob` | analyzerMessageId, requestedBy, status, claimedAt, completedAt, outcome | one active replay per message |
| `AccessionCounter` | siteCode, businessDate, nextValue | row locked when allocating accession |

Key relationships:

```text
Patient 1--* LabOrder 1--* OrderTest *--1 TestDefinition
                    |--1 Specimen
                    |--1 ResultSet 1--* Result 1--* ResultRevision
                    |--* ReportSnapshot

AnalyzerConnection 1--* AnalyzerMessage 1--* AnalyzerResultItem
                                      |--0..1 AnalyzerException
                                      |--* ReplayJob

User *--* Role *--* Permission
User 1--* Session
AuditEvent references all sensitive entities by type and ID
```

## 3. Status-Transition Rules

### Order

- `ACTIVE -> CANCELED`: Registration, Laboratory User, Validator, or Administrator; non-empty reason required; not allowed after release.
- `ACTIVE -> RELEASED`: performed only inside successful result release.
- `CANCELED` and `RELEASED` are terminal during the MVP.

### Result set

- `PENDING -> ENTERED`: first valid result is saved.
- `ENTERED -> FOR_VALIDATION`: all required order tests have valid results; Laboratory User or Administrator.
- `FOR_VALIDATION -> ENTERED`: Validator or Administrator returns the set with a required reason.
- `FOR_VALIDATION -> VALIDATED`: Validator or Administrator; all required values rechecked in the transaction.
- `VALIDATED -> RELEASED`: Validator or Administrator; creates immutable report snapshot and marks the order released atomically.
- No result edits are allowed in `VALIDATED` or `RELEASED` during the MVP.
- Results from analyzers follow the same states and cannot auto-validate or auto-release.

### Analyzer message

- `RECEIVED -> PROCESSING -> APPLIED`
- `RECEIVED|PROCESSING -> EXCEPTION` for unknown/ambiguous accession, unknown test, invalid value, canceled/released order, or idempotency conflict.
- `RECEIVED|PROCESSING -> RETRYABLE` only for transient LIS/database failures.
- `RETRYABLE -> PROCESSING` through bounded retry.
- `RETRYABLE -> DEAD_LETTER` after five attempts at 5s, 30s, 2m, 10m, and 30m.
- `EXCEPTION -> RESOLVED_REJECTED` or `EXCEPTION -> RESOLVED_RECONCILED` by Validator or Administrator.
- Replay creates a `ReplayJob`; it does not erase or mutate original message history.

### Replay job

- `REQUESTED -> CLAIMED -> SUCCEEDED|DUPLICATE|EXCEPTION|FAILED`
- Only Validator or Administrator can request replay.
- Gateway claims one job at a time using a claim token with a five-minute lease.

## 4. Transaction Boundaries

Each operation below uses one Prisma interactive transaction. Audit insertion is mandatory before commit.

| Operation | Atomic writes |
|---|---|
| Patient creation/edit | patient, duplicate candidates, audit |
| Order creation | accession counter lock/increment, order, order tests, specimen, result set, audit |
| Order cancellation | order status/reason, pending analyzer exception updates, audit |
| Manual result save | result upsert, result revision, result-set state change, audit |
| Submit for validation | required-result verification, result-set transition, audit |
| Return from validation | transition, reason, audit |
| Validate | authorization, state/version check, validated metadata, audit |
| Release | state check, deterministic report render, report snapshot/hash, result-set/order release, audit |
| Analyzer ingestion | idempotency insert/check, raw envelope, matching, result/revision or exception, audit |
| Exception resolution | exception outcome, matched result if reconciled, audit |
| Replay request | replay job, audit |
| User/role change | user/role assignments, session revocation when required, audit |

External calls and filesystem writes do not occur inside database transactions. Report bytes are rendered before the release transaction from a versioned release candidate, then the transaction rechecks entity versions before storing the snapshot.

## 5. Analyzer Gateway-to-LIS API Contracts

Shared Zod contracts live in `packages/analyzer-contracts` and generate OpenAPI-compatible JSON schemas.

### `POST /api/gateway/v1/health`

Headers: `Authorization: Bearer {the configured 256-bit gateway token}`, `X-Gateway-Id`, `X-Request-Id`.

```ts
type GatewayHealthRequest = {
  schemaVersion: "1.0";
  gatewayId: string;
  gatewayVersion: string;
  occurredAt: string;
  connections: Array<{
    connectionId: string;
    status: "ONLINE" | "OFFLINE" | "DELAYED" | "ERROR";
    lastSuccessfulMessageAt: string | null;
    errorCode: string | null;
  }>;
};

type GatewayHealthResponse = { acceptedAt: string };
```

Returns `202`, `401`, `403`, or `422`.

### `POST /api/gateway/v1/messages`

Additional header: `Idempotency-Key` equal to the body value.

```ts
type NormalizedAnalyzerEnvelope = {
  schemaVersion: "1.0";
  gatewayMessageId: string;
  gatewayId: string;
  connectionId: string;
  adapter: { type: string; version: string };
  occurredAt: string;
  receivedAt: string;
  idempotencyKey: string;
  rawSha256: string;
  rawEncoding: "UTF-8" | "ASCII" | "BINARY_BASE64";
  rawPayload: string;
  accessionId?: string;
  sampleId?: string;
  results: Array<{
    itemIndex: number;
    analyzerTestCode: string;
    valueType: "NUMERIC" | "TEXT" | "QUALITATIVE";
    value: string;
    unit?: string;
    flags: string[];
  }>;
};

type AnalyzerMessageResponse = {
  messageId: string;
  outcome: "ACCEPTED" | "DUPLICATE" | "EXCEPTION" | "RETRY" | "REJECTED";
  exceptionType?: "UNKNOWN_ACCESSION" | "AMBIGUOUS_SAMPLE" | "UNKNOWN_TEST" |
    "INVALID_VALUE" | "ORDER_CANCELED" | "ORDER_RELEASED" | "IDEMPOTENCY_CONFLICT";
  retryAfterSeconds?: number;
};
```

Returns `202` accepted/exception, `200` duplicate, `409` idempotency conflict, `422` structurally rejected, `429` or `503` retryable.

### `GET /api/gateway/v1/replay-jobs?limit=10`

Returns authorized unclaimed jobs containing `replayJobId`, `originalGatewayMessageId`, `connectionId`, `claimToken`, and `leaseExpiresAt`. Raw payload is supplied only after the gateway presents the claim token.

### `GET /api/gateway/v1/replay-jobs/{id}/payload`

Header `X-Replay-Claim-Token` must match the active, unexpired claim. Returns the original envelope and raw payload. Returns `200`, `401`, `403`, `404`, or `409` when the claim is absent, expired, or owned by another gateway.

### `POST /api/gateway/v1/replay-jobs/{id}/complete`

```ts
type ReplayCompletion = {
  claimToken: string;
  outcome: "SUCCEEDED" | "DUPLICATE" | "EXCEPTION" | "FAILED";
  deliveryRequestId: string;
  completedAt: string;
  errorCode?: string;
};
```

All gateway endpoints reject browser sessions and accept only an active machine credential scoped to the supplied gateway and connection IDs.

## 6. Idempotency and Duplicate-Message Strategy

1. Prefer a vendor/protocol message control ID when the simulator or future adapter supplies one.
2. Construct the stable key as SHA-256 of `connectionId + protocolMessageId`. If no control ID exists, hash `connectionId + canonical raw bytes`.
3. Store a unique constraint on `(connectionId, idempotencyKey)`.
4. If the same key and same raw hash arrive again, return the stored outcome without adding a result or a second audit event; record a delivery-attempt counter separately.
5. If the same key arrives with a different raw hash, create an `IDEMPOTENCY_CONFLICT` exception and never apply it automatically.
6. A single message may carry multiple result items. Each item has a stable `itemIndex`; `(analyzerMessageId, itemIndex)` is unique.
7. Applying a result also checks one current result per `OrderTest`. A new analyzer item cannot overwrite a manual or analyzer result silently; it becomes an exception unless an authorized reconciliation explicitly chooses replacement.
8. Replay reuses the original idempotency key. A previously applied message therefore returns `DUPLICATE`, while a corrected reconciliation creates an explicit new authorized application record linked to the original message.
9. Gateway spool files use `gatewayMessageId.json` and atomic write-to-temporary-then-rename. Files move through `pending`, `inflight`, `dead-letter`, and `completed` folders.

## 7. Authentication and Permission Matrix

`X` means permitted through API policy; all other actions are denied even if UI controls are manipulated.

| Capability | Administrator | Registration | Laboratory User | Validator | Gateway machine |
|---|:---:|:---:|:---:|:---:|:---:|
| Manage users/roles | X |  |  |  |  |
| Create/search/view patient | X | X | X | X |  |
| Edit permitted demographics | X | X |  |  |  |
| Create order/accession | X | X | X |  |  |
| Cancel unreleased order | X | X | X | X |  |
| View queue | X | X | X | X |  |
| Enter/edit pending results | X |  | X |  |  |
| Submit for validation | X |  | X |  |  |
| Return for correction | X |  |  | X |  |
| Validate/release | X |  |  | X |  |
| Print released report | X | X | X | X |  |
| View analyzer dashboard | X |  | X | X |  |
| Reconcile/reject exception | X |  |  | X |  |
| Request replay | X |  |  | X |  |
| Submit health/messages |  |  |  |  | X |
| Claim/complete replay job |  |  |  |  | X |
| View audit | X |  |  | X |  |
| Read raw analyzer payload | X |  |  | X | scoped API only |

Sessions use a 256-bit random secret stored only as a SHA-256 token hash. Cookies are HTTP-only, same-site strict, secure in HTTPS production, and expire after 30 minutes of inactivity. Passwords use Argon2id. Five failures lock the account for 15 minutes. Gateway tokens are 256-bit random credentials stored as hashes and rotated by an Administrator.

## 8. Audit-Event Design

```ts
type AuditEventInput = {
  action: string;
  entityType: string;
  entityId: string;
  actor: { type: "USER" | "GATEWAY" | "SYSTEM"; id: string };
  requestId: string;
  workstation?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
};
```

Action names use `DOMAIN.VERB`, including `PATIENT.CREATED`, `PATIENT.UPDATED`, `ORDER.CREATED`, `ORDER.CANCELED`, `RESULT.SAVED`, `RESULT.SUBMITTED`, `RESULT.RETURNED`, `RESULT.VALIDATED`, `RESULT.RELEASED`, `REPORT.GENERATED`, `AUTH.LOGIN_SUCCEEDED`, `AUTH.LOGIN_FAILED`, `USER.ROLE_CHANGED`, `ANALYZER.MESSAGE_RECEIVED`, `ANALYZER.MESSAGE_APPLIED`, `ANALYZER.EXCEPTION_CREATED`, `ANALYZER.EXCEPTION_RESOLVED`, `ANALYZER.REPLAY_REQUESTED`, and `ANALYZER.REPLAY_COMPLETED`.

Audit rules:

- Repository exposes insert and query only; no update/delete methods.
- Sensitive services receive a transaction-scoped audit writer.
- Password hashes, session tokens, gateway secrets, report bytes, and raw analyzer payloads never appear in before/after JSON.
- Authentication failures use a short independent transaction because no domain mutation occurs.
- Duplicate analyzer deliveries increment delivery metadata but do not duplicate the clinical application audit.
- Audit views are paginated and filtered by actor, action, entity, and time range.

## 9. Windows Development and Production Service Strategy

### Development

- PostgreSQL runs as its standard Windows service.
- Next.js and the gateway run from one terminal using the root `pnpm dev` script.
- LIS listens on `http://localhost:3000`; LAN binding is enabled only when needed for workstation testing.
- Gateway calls `http://127.0.0.1:3000/api/gateway/v1`.
- Development credentials live in ignored `.env.local` files copied from `.env.example`.

### Production packaging

- `next.config.ts` uses `output: "standalone"`.
- `scripts/windows/package-release.ps1` stages the Next standalone server, static assets, gateway bundle, contracts, Prisma migration files, service XML, and operations documentation under a timestamped directory such as `C:\QuestcareLIS\releases\20260729-213000`.
- `C:\QuestcareLIS\current` points to the approved release directory.
- PostgreSQL remains its own Windows service.
- WinSW runs `QuestcareLIS-App` using `node C:\QuestcareLIS\current\lis\server.js`.
- WinSW runs `QuestcareLIS-Gateway` using `node C:\QuestcareLIS\current\gateway\main.js` and depends operationally on the LIS health endpoint, but repeated LIS unavailability sends messages to the durable gateway spool instead of stopping the gateway.
- Services run under dedicated least-privilege local service accounts with write access only to their data/log directories.
- Recovery policy restarts each service after 10 seconds, 30 seconds, then 60 seconds; further failure remains stopped and is logged for operator action.

### HTTPS production gate

Caddy is the recommended TLS reverse proxy because it can run as a Windows service and place Next.js behind `https://lis.questcare.local`. Before go-live, the site name, certificate authority, workstation trust distribution, and renewal procedure must be approved. HTTP remains acceptable for development and early MVP verification.

### Backup

`backup.ps1` runs `pg_dump --format=custom`, calculates SHA-256, records the result through an admin API, and writes to a configured directory outside the live PostgreSQL data directory. `restore.ps1` restores only into a named test database unless an operator explicitly follows the documented disaster-recovery procedure.

## 10. Milestones and Testing Plan

### Task 1: Workspace foundation and executable skeleton

**Files:** root workspace files, `apps/lis`, `apps/analyzer-gateway`, `packages/analyzer-contracts`, `packages/typescript-config`, `.env.example`.

**Interfaces:** Produces root scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:integration`, `test:e2e`; LIS `GET /api/health`; gateway `Gateway.start()` and `Gateway.stop()`.

- [ ] Create the pnpm workspace and strict TypeScript configurations.
- [ ] Scaffold the Next.js App Router application without a separate backend.
- [ ] Add the gateway Node application and shared contract package.
- [ ] Write failing health tests for LIS and gateway startup/shutdown.
- [ ] Implement minimal health endpoints and graceful signal handling.
- [ ] Run `pnpm lint && pnpm typecheck && pnpm test` and capture output.
- [ ] Commit `chore: scaffold LIS monorepo and gateway`.

### Task 2: Database foundation and transaction-safe audit

**Files:** `apps/lis/prisma/schema.prisma`, initial migration, Prisma client/transaction modules, audit module, database tests.

**Interfaces:** Produces `withDomainTransaction<T>(fn)`, `AuditWriter.record(tx, event)`, UUID and accession utilities.

- [ ] Write failing integration tests proving audit and domain changes commit or roll back together.
- [ ] Define the entities and indexes listed in Section 2.
- [ ] Create the initial migration and explicit append-only audit database permissions for the application role.
- [ ] Implement transaction-scoped repositories and audit writer.
- [ ] Prove the application has no audit update/delete method and a failed audit insert rolls back the mutation.
- [ ] Run migration, integration tests, and schema formatting.
- [ ] Commit `feat: add LIS domain schema and atomic audit`.

### Task 3: Authentication, sessions, and API authorization

**Files:** auth/users modules, login UI/API, cookie/session security, permission tests, user seed.

**Interfaces:** Produces `authenticate(request): Promise<Principal>`, `requirePermission(principal, permission)`, `createSession(userId)`, and `revokeSessions(userId)`.

- [ ] Write failing tests for Argon2id verification, lockout, inactivity expiry, CSRF rejection, and every matrix row.
- [ ] Implement named users, roles, permissions, hashed sessions, and login/logout.
- [ ] Enforce permissions in Route Handlers and services.
- [ ] Seed the four roles and a one-time development Administrator whose forced password change is required on first login.
- [ ] Add Playwright login/logout/denial tests.
- [ ] Run unit, integration, and Chromium tests.
- [ ] Commit `feat: add authentication and permission enforcement`.

### Task 4: Master data, patients, orders, accessions, and queue

**Files:** patient/order/queue modules and pages, test catalog seed, relevant APIs and tests.

**Interfaces:** Produces `PatientService.create/update/search`, `OrderService.create/cancel`, `QueueService.search`; accession allocation is internal to `OrderService.create`.

- [ ] Write failing service tests for patient uniqueness, duplicate warnings, field permissions, accession concurrency, order cancellation, and queue filtering.
- [ ] Seed representative numeric, text, and qualitative tests with units and ranges.
- [ ] Implement patient create/search/view/edit with optimistic version checking.
- [ ] Implement atomic order/accession/specimen/result-set creation and cancellation with reason.
- [ ] Implement paginated queue filters for accession, patient, priority, source, and status.
- [ ] Add Playwright patient-to-queue scenarios.
- [ ] Run concurrency test proving 100 parallel allocations produce 100 unique accessions.
- [ ] Commit `feat: add patients orders accessions and queue`.

### Task 5: Result entry, validation, release, and report snapshots

**Files:** result state machine/service/repository/pages, report renderer/service/API, tests and PDF fixtures.

**Interfaces:** Produces `ResultService.save/submit/return/validate/release`; `ReportRenderer.render(candidate): Promise<Uint8Array>`.

- [ ] Write failing transition-table tests for every allowed and forbidden transition.
- [ ] Write failing value tests for numeric precision, text, qualitative options, units, ranges, and missing required results.
- [ ] Implement manual result entry and append-only revisions.
- [ ] Implement submit, return-with-reason, validation, and release policies.
- [ ] Implement deterministic A4 PDF rendering and SHA-256 report snapshot.
- [ ] Prove release transaction rolls back when audit or snapshot persistence fails.
- [ ] Add Playwright patient-to-final-report workflow and store the PDF in test evidence.
- [ ] Commit `feat: add validated result workflow and reports`.

### Task 6: Language-neutral analyzer contract and simulator gateway

**Files:** shared contract package, gateway adapter contract/simulator/LIS client/spool, LIS gateway auth and health APIs.

**Interfaces:** Produces the Section 5 types; `AnalyzerAdapter.start/stop/health`; `LisClient.submitMessage`; `DurableOutbox.enqueue/claim/complete/fail`.

- [ ] Write contract tests that parse equivalent TypeScript-generated JSON and reject unknown schema versions or invalid typed values.
- [ ] Implement the normalized message, health, response, and replay Zod schemas.
- [ ] Implement gateway machine-token authentication and connection scoping.
- [ ] Implement atomic-file durable outbox and dead-letter folders.
- [ ] Implement simulator connect/disconnect/result generation.
- [ ] Implement LIS client retry classification and graceful shutdown.
- [ ] Stop the gateway and prove all manual LIS Playwright tests still pass.
- [ ] Commit `feat: add analyzer contract and simulator gateway`.

### Task 7: Analyzer ingestion, matching, exceptions, and idempotency

**Files:** LIS analyzer repository/matcher/service/API/dashboard, gateway integration fixtures, tests.

**Interfaces:** Produces `AnalyzerIngestionService.ingest(envelope)`, `AnalyzerExceptionService.resolve/reject/requestReplay`.

- [ ] Write failing tests for exact accession, unique sample, ambiguous sample, unknown test, invalid value, canceled/released order, duplicate, and conflicting idempotency key.
- [ ] Implement durable envelope persistence before matching.
- [ ] Implement safety matcher and analyzer-code-to-LIS-test mapping.
- [ ] Apply accepted results through the same result service and audit transaction used by manual entry.
- [ ] Implement exception dashboard and authorized reconcile/reject actions.
- [ ] Implement replay request/claim/complete flow without changing original message identity.
- [ ] Prove 100 concurrent duplicate deliveries create one analyzer message application and one result revision.
- [ ] Commit `feat: add safe analyzer ingestion and exceptions`.

### Task 8: Backup, restoration, health, and offline resilience

**Files:** PowerShell backup/restore scripts, health modules, operations documentation, resilience tests.

**Interfaces:** Produces `backup.ps1`, `restore.ps1`, `/api/health`, gateway health dashboard, and backup history recording.

- [ ] Write script tests for missing tools, failed dump, checksum mismatch, and forbidden production-target restore.
- [ ] Implement custom-format PostgreSQL dump, SHA-256 sidecar, timestamped history, and retention pruning.
- [ ] Implement test-database restoration and verification query.
- [ ] Add service/database/disk/gateway health checks with PHI-safe output.
- [ ] Disconnect internet and execute the complete manual LIS workflow plus simulator workflow.
- [ ] Stop/restart the gateway and prove spooled messages deliver once after recovery.
- [ ] Store backup/restore and offline evidence.
- [ ] Commit `feat: add backup restore and offline resilience`.

### Task 9: Capacity, security, and MVP acceptance verification

**Files:** capacity runner, Playwright acceptance suite, evidence collector, security checklist and test report.

**Interfaces:** Produces `pnpm test:capacity`, `pnpm test:acceptance`, and a timestamped evidence directory.

- [ ] Create deterministic capacity data for 500 daily requests, 5,000 tests, and 25 users.
- [ ] Implement response-time measurement for patient search, save, queue, result save, and report generation.
- [ ] Implement 60 analyzer messages/minute sustained simulator test and duplicate burst test.
- [ ] Automate all 18 approved acceptance scenarios.
- [ ] Run permission, CSRF, secret exposure, ordinary-log PHI, raw-message authorization, and session tests.
- [ ] Verify storage warning calculations at 20% and 10% free space.
- [ ] Collect machine specs, commands, durations, percentiles, reports, screenshots, and logs in test evidence.
- [ ] Commit `test: verify MVP acceptance and capacity targets`.

### Task 10: Windows production packaging and go-live security gate

**Files:** release packaging/service scripts, WinSW XML, Caddy configuration, Windows setup, backup, recovery, and HTTPS documents.

**Interfaces:** Produces signed-off release directory layout and operator commands in Section 11.

- [ ] Write packaging tests that fail when required assets, migrations, static files, or documentation are absent.
- [ ] Implement standalone Next.js and bundled gateway staging.
- [ ] Add least-privilege WinSW service definitions, dependencies, logs, and restart policy.
- [ ] Implement production migration and rollback-to-previous-application-release procedure; database migrations remain forward-only with a required pre-deployment backup.
- [ ] Configure Caddy TLS after the production hostname and trust approach are approved.
- [ ] Test install, start, stop, restart, power-recovery, service-account permissions, firewall, HTTPS, backup, and restore on the approved Windows machine.
- [ ] Commit `ops: add Windows production deployment package`.

## 11. Exact Setup, Migration, Seed, Development, and Test Commands

Run from a PowerShell terminal at the repository root.

### Prerequisites and initial setup

```powershell
node --version
npm install --global pnpm@10
pnpm --version
pnpm install
Copy-Item .env.example .env.local
Copy-Item apps/lis/.env.example apps/lis/.env.local
Copy-Item apps/analyzer-gateway/.env.example apps/analyzer-gateway/.env.local
pnpm exec playwright install chromium
```

Configure `DATABASE_URL`, `SESSION_SECRET`, `GATEWAY_TOKEN`, and local paths in the ignored environment files before continuing.

### Database

```powershell
createdb -U postgres questcare_lis_dev
createdb -U postgres questcare_lis_test
pnpm --filter @questcare/lis prisma migrate dev --name init
pnpm --filter @questcare/lis prisma generate
pnpm --filter @questcare/lis prisma db seed
```

Production migrations use only:

```powershell
pnpm --filter @questcare/lis prisma migrate deploy
```

### Development

```powershell
pnpm dev
pnpm --filter @questcare/lis dev
pnpm --filter @questcare/analyzer-gateway dev
```

### Quality and tests

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:acceptance
pnpm test:capacity
pnpm build
```

Targeted commands:

```powershell
pnpm --filter @questcare/lis vitest run src/modules/results/state-machine.test.ts
pnpm --filter @questcare/lis exec playwright test tests/e2e/patient-to-report.spec.ts --project=chromium
pnpm --filter @questcare/analyzer-gateway vitest run tests/contract.test.ts
```

### Backup and restoration verification

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/backup.ps1 -EnvironmentFile apps/lis/.env.production
powershell -ExecutionPolicy Bypass -File scripts/windows/restore.ps1 -BackupFile C:\QuestcareLIS\backups\approved.backup -TargetDatabase questcare_lis_restore_test
```

### Production package and services

```powershell
pnpm build
powershell -ExecutionPolicy Bypass -File scripts/windows/package-release.ps1
powershell -ExecutionPolicy Bypass -File scripts/windows/install-services.ps1
C:\QuestcareLIS\service\WinSW.exe status C:\QuestcareLIS\service\lis-service.xml
C:\QuestcareLIS\service\WinSW.exe status C:\QuestcareLIS\service\gateway-service.xml
```

## 12. Risks and Decisions Requiring Approval

### Blocks implementation start

1. **Repository location and Git initialization:** The current workspace has no application repository or Git history. Approve creating the monorepo in this workspace and initializing Git, or provide the intended repository.
2. **Gateway spool design:** This plan uses atomic files under `%ProgramData%` so messages survive LIS downtime without adding SQLite. Approve this choice; otherwise choose an embedded gateway database.
3. **Patient and order fields:** Provide or approve the exact MVP demographic fields, requesting-source fields, and accession format. The implementation can scaffold generic fields, but acceptance cannot be objective without the approved set.
4. **Seeded test catalog:** Provide or approve the MVP tests, units, decimal precision, qualitative choices, and reference ranges. Clinical values must come from authorized laboratory personnel.
5. **Result report layout:** Supply the approved A4 sample, required identifiers, logo, signatories, preliminary marking, and final report wording.

### Does not block early milestones but blocks acceptance or production

6. **Production Windows target:** Confirm Windows edition, server hardware, workstation browser versions, service-account policy, and PostgreSQL installation ownership before Milestone 10.
7. **Production hostname and HTTPS:** Approve the local DNS name, Caddy versus an existing IIS/certificate infrastructure, certificate authority, and workstation trust distribution before go-live.
8. **Backup policy:** Approve destination, schedule, retention, encryption requirement, and responsible operator before backup acceptance.
9. **Raw analyzer retention:** Approve retention and restricted-access policy for raw messages before analyzer acceptance.
10. **Time source:** Approve the local timezone and server/workstation synchronization source before UAT so audit and analyzer timestamps are consistent.

### Engineering risks with planned controls

- Windows service packaging can differ from interactive development; Milestone 10 tests the exact production machine.
- Deterministic PDF output can vary with fonts; package approved fonts and hash the stored bytes, not a regenerated document.
- Analyzer message bursts can expose transaction contention; unique constraints, short transactions, and the 60/minute capacity test control this.
- File spool corruption after power loss is controlled with atomic rename, checksums, startup recovery scans, and dead-letter quarantine.
- Prisma cannot express every database constraint; create reviewed SQL in migrations for typed-result checks, append-only audit permissions, and required uniqueness.
- Local HTTP exposes credentials on a shared LAN; it is limited to development, while production requires the HTTPS gate.

## Plan Approval Gate

No source scaffolding, database migration, package installation, or implementation task may begin until Optrizo approves this implementation plan and resolves the five implementation-start decisions above.
