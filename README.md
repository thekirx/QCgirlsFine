# Questcare Offline LIS MVP

Questcare is a local-network laboratory information system built as a Next.js modular monolith with PostgreSQL/Prisma and a separate analyzer gateway. Patient registration, ordering, manual results, validation, release, PDF reporting, and audit remain usable without internet access.

## Requirements

- Node.js 24
- pnpm 11
- PostgreSQL 18
- Chrome or Edge for workstations

## First-time setup

```bash
pnpm install
createdb questcare_lis_dev
cp .env.example apps/lis/.env
# Edit apps/lis/.env with the local PostgreSQL username and matching secrets.
pnpm db:migrate
pnpm db:seed
```

For the included local development defaults on this machine, `apps/lis/.env` uses:

```text
postgresql://kiro@127.0.0.1:5432/questcare_lis_dev?schema=public
```

## Run

Start the LIS and gateway together:

```bash
pnpm dev
```

Open `http://127.0.0.1:3000`. Other LAN workstations may use the server's local IP when Next.js is started with an approved LAN hostname binding.

Send one simulated result by starting the gateway with an active accession:

```bash
SIM_ACCESSION=QC20260729-0001 SIM_TEST_CODE=GLU SIM_VALUE=99 pnpm --filter @questcare/analyzer-gateway dev
```

Pending gateway envelopes are stored under ignored `runtime-data/gateway/spool`. The `SpoolStore` interface allows the production location to move later to `%ProgramData%\QuestcareLIS\gateway\spool`.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Administrator | `admin` | `Admin123!Quest` |
| Registration | `registration` | `Register123!` |
| Laboratory User | `laboratory` | `Laboratory123!` |
| Validator | `validator` | `Validator123!` |

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

The end-to-end test blocks every non-local network request while exercising login, registration, ordering, accessioning, result entry, validation, release, PDF retrieval, and analyzer exception handling.

## MVP limitations

- Demo catalog and reference ranges are configuration examples and require clinical approval before patient use.
- One immutable A4 final report is included; amendments and final Questcare branding are deferred.
- Simulator only: no physical analyzer protocols, ASTM, HL7, or bidirectional communication.
- Unmatched/unsafe analyzer messages can be reviewed and rejected; assisted remapping/replay is deferred.
- No QC, billing, inventory, HIS, cloud synchronization, production HTTPS, Windows services, production packaging, or automated disaster recovery.
- Basic local smoke-test capacity only; production tuning is deferred.
