# Questcare Offline LIS MVP Architecture

Date: 2026-07-29
Status: Approved

## 1. Objective

Build the Questcare Offline LIS MVP as a local-network, browser-accessible system that continues to support its core laboratory workflow without internet access. The architecture must favor fast MVP delivery while preserving a clean path for physical analyzer integrations and future multi-branch or cloud capabilities.

The approved platform consists of:

- A Next.js full-stack modular LIS application
- PostgreSQL accessed through Prisma
- A separate, long-running analyzer gateway service

The MVP will not include a separate Fastify or general-purpose backend service.

## 2. System Boundary

### 2.1 Next.js LIS application

The Next.js application owns:

- Browser user interface
- Route Handler APIs
- Authentication and session management
- Role and permission enforcement
- Patient registration and demographic maintenance
- Laboratory orders and accession generation
- Work queues and result-entry workflows
- Validation and release rules
- Report generation and report snapshots
- Audit logging
- Prisma repositories and PostgreSQL persistence
- Administrative configuration included in the MVP

Next.js Route Handlers are the primary business API. Server Actions may be used only for simple, internal UI mutations when they do not weaken API validation, permission enforcement, auditability, or testability.

### 2.2 Analyzer gateway

The analyzer gateway is a separate long-running service. It owns:

- The MVP analyzer simulator
- Persistent analyzer connections
- Future serial, TCP/IP, file-based, ASTM, and HL7 integrations
- Future Python adapters
- Future Windows-native C# or .NET adapters required by vendor DLLs
- Adapter lifecycle and connection health
- Raw message receipt and outbound analyzer communication
- Message normalization
- Retry scheduling
- Dead-letter handling
- Controlled replay

The gateway must remain independently restartable. Gateway or adapter failure must not prevent patient registration, manual result entry, validation, release, reporting, or other core LIS operations.

## 3. Next.js Internal Structure

The Next.js application is a modular monolith. UI and deployment remain centralized, while business concerns are separated internally.

Each business module should contain clearly separated layers:

1. Route Handlers receive HTTP requests, authenticate the caller, validate input, invoke a service, and translate the result into an HTTP response.
2. Service modules implement business rules and transaction boundaries.
3. Repository modules contain Prisma queries and persistence behavior.
4. Shared Zod schemas define request, response, command, and normalized data contracts.
5. Authorization policies enforce permissions inside the API and service layer, not only in the user interface.
6. Audit writers create audit records within the same database transaction as sensitive state changes.

Route Handlers must remain thin. They must not contain laboratory workflow rules or direct Prisma queries.

Suggested module boundaries:

- auth
- users-and-roles
- patients
- orders-and-accessions
- work-queue
- results
- validation-and-release
- reports
- audit
- analyzer-inbox-and-exceptions
- administration
- backup-and-health

Cross-module calls should use published service interfaces rather than importing another module's repository directly.

## 4. Data Ownership

PostgreSQL is the system of record for LIS business data. Prisma migrations manage the application schema.

The Next.js application is the only component allowed to perform authoritative patient, order, result, validation, release, report, and audit state changes. The analyzer gateway must not write directly to those domain tables.

The gateway communicates with Next.js through authenticated Route Handler APIs. Gateway messages enter a durable LIS inbox before they are matched or applied to clinical records. Next.js applies normalized messages through the same service and audit rules used by other trusted inputs.

Sensitive state transitions must be atomic. The business update and its audit event must commit or roll back together. This includes:

- Patient demographic changes
- Order creation and cancellation
- Manual or analyzer result posting
- Analyzer exception reconciliation
- Validation
- Release
- Corrected or amended report creation when later added
- Controlled replay authorization and outcome

## 5. Analyzer Adapter Contract

Every adapter, regardless of implementation language, must conform to a language-neutral contract.

The contract must cover:

- Adapter identity and version
- Analyzer connection instance identity
- Connection state and last successful communication
- Start, stop, reconnect, and health operations
- Raw message metadata and cryptographic hash
- Normalized result messages
- Stable idempotency key
- Acknowledgment outcome
- Retry classification
- Dead-letter reason
- Replay correlation and authorization metadata
- Structured errors that do not expose patient data in ordinary logs

For the MVP, the TypeScript simulator implements this contract. Future Python and .NET adapters may run as separate processes behind the same gateway boundary. The Next.js application must not depend on adapter language, vendor SDK, transport, or analyzer protocol.

## 6. Gateway-to-LIS Communication

The gateway communicates with dedicated authenticated Next.js Route Handlers over the local machine or approved LAN path.

The minimum workflow is:

1. Gateway receives or generates a raw analyzer message.
2. Gateway hashes and normalizes the message.
3. Gateway submits it with adapter, connection, and idempotency metadata.
4. Next.js stores the inbound envelope durably.
5. A service transaction checks idempotency and attempts exact accession or approved sample matching.
6. A valid message is applied to the correct order and audited.
7. An unsafe or unresolved message enters the exception queue.
8. The API returns an explicit accepted, duplicate, exception, retryable-failure, or rejected outcome.
9. Gateway retries only retryable failures using bounded backoff.
10. Exhausted retryable messages enter dead-letter handling.

Controlled replay is requested and authorized in the LIS. Replay must preserve the original message identity and remain idempotent.

## 7. Analyzer Safety Rules

- Match first by exact accession ID.
- Match by exact sample ID only when it resolves to one active order under approved rules.
- Never match by patient name alone.
- Repeated delivery must not create a second result.
- Messages for cancelled or released orders must enter the exception queue.
- Unknown accessions, unknown tests, invalid values, malformed messages, and ambiguous matches must not silently disappear.
- Reconciliation and replay require Validator or Administrator authorization.
- Raw messages and their SHA-256 hashes are stored separately from ordinary diagnostic logs.
- Ordinary logs must not expose patient data.

## 8. Authentication, Authorization, and Security

The MVP uses named accounts and API-enforced permissions for Administrator, Registration, Laboratory User, and Validator roles.

The baseline includes:

- Argon2id password hashing
- Minimum 12-character passwords
- Lockout after five failed attempts for 15 minutes
- Thirty-minute inactivity timeout
- HTTP-only session cookies
- CSRF protection
- Zod validation at trust boundaries
- Secrets outside source control
- No direct database credentials in the browser
- Automated permission-matrix tests
- Authenticated gateway endpoints with a separately managed machine credential

Production transport must use local HTTPS unless Optrizo explicitly approves and documents an alternative LAN security decision before deployment.

## 9. Reporting and Auditability

The MVP produces one reproducible A4 PDF report. Final release creates an immutable report snapshot with a report identifier and hash so later configuration changes do not silently alter an already released report.

Audit coverage includes login, patient, order, result, validation, release, report, user, analyzer-message, exception, reconciliation, and replay events. Audit records identify the actor, action, target, timestamp, workstation or service identity where available, and before/after values where applicable.

## 10. Deployment Model

The laboratory server runs:

- Next.js LIS application
- PostgreSQL
- Analyzer gateway
- Reporting support
- Backup task
- Health monitoring

Workstations use supported Chrome or Edge browsers over the local LAN. No application installation is required on each workstation. Core operation does not depend on internet access.

Production operation must not require Docker. The implementation plan must define Windows service installation, automatic startup, controlled shutdown, firewall rules, log locations, backup scheduling, and recovery procedures for every server component.

## 11. Testing Strategy

Each milestone includes unit, integration, and browser-level tests as appropriate.

Required coverage includes:

- Service-level laboratory workflow rules
- Repository constraints and transactions
- Permission matrix
- Audit events committed with sensitive state changes
- Patient, order, queue, result, validation, release, and report flow
- Analyzer normalized-message contract
- Exact match, unmatched, duplicate, cancelled/released order, invalid-format, retry, dead-letter, reconciliation, and replay behavior
- Gateway disconnection and restart recovery
- Core operation with internet unavailable
- Backup creation, checksum verification, and restoration into a test database
- Capacity smoke tests against the approved hardware and dataset

Test evidence will be stored under `docs/test-evidence` and will include relevant screenshots, logs, generated reports, and verification output.

## 12. MVP Exclusions

The architecture does not add the following to the MVP:

- Physical analyzer connections
- Production ASTM or HL7 parsers
- Bidirectional host query
- Barcode-printer production integration
- Patient merge or unmerge
- Full clinical rules, delta checks, reflex tests, auto-validation, or critical-result notification
- Laboratory quality control, Levey-Jennings charts, or Westgard rules
- Historical migration, HIS/EMR, billing, inventory, cloud synchronization, portals, or multi-branch UI
- Standby server
- Automatic production updater
- Full support portal

These exclusions must not weaken the adapter boundary or identifier design needed for later additions.

## 13. Implementation Planning Constraints

The implementation plan must:

- Use Next.js as the only main LIS application and business API.
- Not introduce Fastify or another general-purpose LIS backend.
- Keep the analyzer gateway as a separate long-running service.
- Define a language-neutral analyzer adapter contract before simulator implementation.
- Define database and transaction boundaries before feature work.
- Deliver tests and verification evidence with every milestone.
- Preserve offline operation and analyzer-gateway fault isolation throughout the build.
