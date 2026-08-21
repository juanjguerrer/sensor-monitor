# sensor-monitor

A sensor monitoring system built with GraphQL and PostgreSQL. Industrial plants have
locations, locations have sensors, and sensors produce readings over time.

This is a learning project: the SQL is written by hand with no ORM, and the goal is to
understand each layer rather than to ship fast.

## Status

| Phase | State |
|---|---|
| Backend — GraphQL API | In progress |
| Anomaly detection | Not started |
| Angular frontend | Not started |
| Docker + CI/CD | Not started |
| Python AI agent | Not started |

## Stack

- **Node.js 22** + **TypeScript** (strict, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`)
- **Apollo Server v5** — GraphQL runtime
- **PostgreSQL** via the raw `pg` driver — no ORM, SQL written by hand
- **GraphQL Code Generator** — resolver types derived from the schema
- **Jest** + **ts-jest** — set up, tests not written yet

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
│   ├── init.sql            # Schema: roles, users, plants, locations, sensors, readings
│   └── seed_base.sql       # Base data
├── src/
│   ├── db/
│   │   ├── pool.ts         # pg connection pool from env vars
│   │   ├── repository.ts   # Hand-written SQL, GraphQL-agnostic
│   │   └── errors.ts       # NotFoundError domain error
│   ├── graphql/
│   │   ├── errors.ts       # Constraint name to error code mapping
│   │   └── errorHandling.ts# Apollo formatError hook
│   ├── generated/
│   │   └── types.ts        # Generated, do not edit by hand
│   ├── schema.ts           # GraphQL type definitions
│   ├── resolvers.ts        # Resolvers, typed via `satisfies Resolvers`
│   └── index.ts            # Entry point
└── codegen.yml
```

## Roadmap

- [ ] `detectAnomalies` — a pure function over readings, no database, no GraphQL
- [ ] Anomaly queries in the schema
- [ ] `scripts/simulate.ts` — generate realistic reading history
- [ ] Jest test suite
- [ ] Authentication (`sensors.created_by` is currently hardcoded)
- [ ] Angular 20 frontend with apollo-angular
- [ ] Docker + docker-compose
- [ ] GitHub Actions CI/CD
- [ ] Python agent for anomaly detection
