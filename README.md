# sensor-monitor

A sensor monitoring system built with GraphQL and PostgreSQL. Industrial plants have
locations, locations have sensors, and sensors produce readings over time.

A personal project pulling the pieces I work with into one system: schema design,
hand-written SQL, a fully typed GraphQL layer, and analysis on top of the data. The data
layer runs on plain `pg` with no ORM — a deliberate exercise in writing the SQL myself
rather than delegating it.

## Status

| Phase | State |
|---|---|
| Backend — GraphQL API | Working |
| Anomaly detection | Working |
| Angular frontend | Not started |
| Docker + CI/CD | Not started |
| Python AI agent | Not started |

## Stack

- **Node.js 22** + **TypeScript** (strict, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`)
- **Apollo Server v5** — GraphQL runtime
- **PostgreSQL** via the raw `pg` driver — no ORM, SQL written by hand
- **GraphQL Code Generator** — resolver types derived from the schema
- **Jest** + **ts-jest** — unit tests over the analysis layer

## Requirements

- Node.js 22 or later
- PostgreSQL 14 or later

## Setup

```bash
git clone https://github.com/juanjguerrer/sensor-monitor.git
cd sensor-monitor/backend
npm install
```

Create the database and its schema:

```bash
createdb sensor_monitor
psql -d sensor_monitor -f scripts/init.sql
psql -d sensor_monitor -f scripts/seed_base.sql
```

Copy the env template and fill in your own credentials:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |

## Running

```bash
npm run dev
```

The server starts at `http://localhost:4000/`, with Apollo Sandbox available in the
browser at that address.

## Tests

```bash
npm test
```

The suite covers `analytics/detectAnomalies.ts`, which is pure — no database, no server,
no fixtures — so it runs in well under a second. Beyond the happy path it pins down the
edge cases that are easy to regress: an empty batch, a batch where every value is
identical, invalid thresholds, and samples too small for the requested threshold to be
mathematically reachable.

One caveat: `isolatedModules` makes ts-jest transpile without type checking, so a green
test run does **not** mean the project compiles. Type errors surface separately:

```bash
npx tsc --noEmit
```

## Regenerating types

Resolver types are generated from the live schema, so **the dev server must already be
running** in another terminal before this works:

```bash
npm run codegen
```

The generator reads the schema over HTTP introspection rather than from the local file.
This is a deliberate workaround: pointing `codegen.yml` at a `.ts` file directly fails on
Windows with `ERR_UNSUPPORTED_ESM_URL_SCHEME`, an upstream bug in
`@graphql-tools/code-file-loader` where a raw `C:/...` path is passed to a dynamic
`import()` instead of a `file://` URL.

Run codegen after any schema change, and before writing resolvers for new fields.

## API

**Queries**

| Field | Returns |
|---|---|
| `sensors` | All sensors |
| `sensor(id)` | One sensor, or `null` if it doesn't exist |
| `readings(sensorId, limit)` | Readings for a sensor, newest first (`limit` defaults to 10) |
| `anomalies(sensorId, limit, threshold)` | Readings more than `threshold` standard deviations from the mean of the last `limit` readings (`limit` defaults to 50, `threshold` to 3) |

**Mutations**

| Field | Returns |
|---|---|
| `createSensor(name, locationId, unit, type)` | The created sensor |
| `updateSensor(id, name, locationId, unit, type)` | The updated sensor |
| `deleteSensor(id)` | The deleted sensor's id |
| `addReading(sensorId, value)` | The created reading |

Timestamps cross the wire as ISO 8601 strings.

## Error handling

Database errors are translated into GraphQL errors in exactly one place, so no resolver
or repository function contains a `try`/`catch`.

- `db/repository.ts` stays GraphQL-agnostic. It lets `pg`'s `DatabaseError` propagate,
  and raises its own `NotFoundError` when a write targets a row that doesn't exist.
- `graphql/errors.ts` maps foreign key constraint names to client-facing codes. A
  constraint that isn't in the map is by definition a server problem, not a client one.
- `graphql/errorHandling.ts` is wired into Apollo's `formatError` hook. It classifies
  every error, attaches a code, and decides what gets logged.

Client mistakes get a specific code and no log entry. Server problems get a generic
message, with the full Postgres detail logged server-side and never sent to the client.

| Situation | Code returned |
|---|---|
| `locationId` doesn't exist | `LOCATION_NOT_FOUND` |
| `sensorId` doesn't exist | `SENSOR_NOT_FOUND` |
| Updating or deleting a missing sensor | `SENSOR_NOT_FOUND` |
| Anything unrecognised | `INTERNAL_SERVER_ERROR` |

## Project structure

```
backend/
├── scripts/
│   ├── init.sql                    # Schema: roles, users, plants, locations, sensors, readings
│   └── seed_base.sql               # Base data
├── src/
│   ├── analytics/
│   │   ├── detectAnomalies.ts      # Z-score detection — pure, no I/O
│   │   └── detectAnomalies.test.ts # Unit tests
│   ├── db/
│   │   ├── pool.ts                 # pg connection pool from env vars
│   │   ├── repository.ts           # Hand-written SQL, GraphQL-agnostic
│   │   ├── types.ts                # Row shapes, shared without pulling in the pool
│   │   └── errors.ts               # NotFoundError domain error
│   ├── graphql/
│   │   ├── errors.ts               # Constraint name to error code mapping
│   │   └── errorHandling.ts        # Apollo formatError hook
│   ├── generated/
│   │   └── types.ts                # Generated, do not edit by hand
│   ├── scripts/
│   │   └── simulate.ts             # Seeds a sensor with realistic reading history
│   ├── schema.ts                   # GraphQL type definitions
│   ├── resolvers.ts                # Resolvers, typed via `satisfies Resolvers`
│   └── index.ts                    # Entry point
├── codegen.yml
├── jest.config.js
└── tsconfig.json
```

Three layers, each independent of the one above it: `db/` knows nothing about GraphQL,
and `analytics/` knows nothing about either — it takes plain data and returns plain data,
which is what keeps it testable without fixtures.

## Roadmap

- [x] `detectAnomalies` — a pure function over readings, no database, no GraphQL
- [x] Anomaly queries in the schema
- [x] `src/scripts/simulate.ts` — generate realistic reading history
- [x] Jest test suite
- [ ] Authentication (`sensors.created_by` is currently hardcoded)
- [ ] Angular 20 frontend with apollo-angular
- [ ] Docker + docker-compose
- [ ] GitHub Actions CI/CD
- [ ] Python agent for anomaly detection
