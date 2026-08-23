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
| Database migrations | Working |
| Docker + docker-compose | Working |
| GitHub Actions CI | Working |
| Angular frontend | Not started |
| Continuous deployment | Not started |
| Python AI agent | Not started |

## Stack

- **Node.js 22** + **TypeScript** (strict, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`)
- **Apollo Server v5** — GraphQL runtime
- **PostgreSQL** via the raw `pg` driver — no ORM, SQL written by hand
- **node-pg-migrate** — versioned schema migrations, no ORM required
- **GraphQL Code Generator** — resolver types derived from the schema
- **Jest** + **ts-jest** — unit tests over the analysis layer
- **Docker** + **docker-compose** — the API, the database and the migration step as
  three containers
- **GitHub Actions** — type check, tests, migrations against a real Postgres, image build

## Requirements

Either Docker, or a local toolchain:

- Docker Desktop (or Docker Engine with the Compose plugin)
- *or* Node.js 22+ and PostgreSQL 14+

## Setup with Docker

```bash
git clone https://github.com/juanjguerrer/sensor-monitor.git
cd sensor-monitor
cp .env.example .env
```

The root `.env` is what Compose substitutes into `docker-compose.yml`. Note that
`DB_HOST=db` — inside the Compose network the database is reached by its service name,
not by `localhost`.

```bash
docker compose up
```

That builds the API image, starts Postgres, waits for it to become healthy, runs the
migrations, seeds the base data, and only then starts the API. Reach it at
**`http://localhost:4001/`**.

The database is published on host port **5433**, not 5432, so it doesn't collide with a
PostgreSQL you may already be running locally.

> **Run Compose commands from the repository root.** Compose searches parent directories
> for `docker-compose.yml`, so `docker compose up` appears to work from `backend/` — but
> the `.env` used for `${...}` substitution is resolved against your *current* directory.
> From `backend/` it picks up `backend/.env`, whose `DB_HOST=localhost` is correct for
> running on your machine and wrong inside a container. The symptom is the migration
> container failing with `ECONNREFUSED 127.0.0.1:5432`. `docker compose config` prints the
> resolved values and settles it in one command.

## Setup without Docker

```bash
git clone https://github.com/juanjguerrer/sensor-monitor.git
cd sensor-monitor/backend
npm install
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DATABASE_URL` | Full connection string, read by the migration tool |

The application reads the five `DB_*` variables; `node-pg-migrate` reads `DATABASE_URL`
only. Both describe the same database, so keep them in sync. If your password contains
`@`, `/`, `:` or `#`, percent-encode it inside `DATABASE_URL`.

There are two `.env` files and they are not interchangeable: `backend/.env` configures the
application when you run it directly on your machine, where the database is at
`localhost`; the root `.env` configures Compose, where it is at `db`. Same keys, different
values, by necessity.

Create the database, build the schema, and load the base data:

```bash
createdb sensor_monitor
```

```bash
npm run migrate -- up
```

```bash
psql -d sensor_monitor -f scripts/seed_base.sql
```

## Running

```bash
npm run dev
```

The server starts at `http://localhost:4000/`, with Apollo Sandbox available in the
browser at that address.

Note that this is a *different* server from the containerized one on port 4001, backed by
a *different* database. Running both at once is a reliable way to confuse yourself about
where your data went.

## Docker

Four services, defined in `docker-compose.yml`:

| Service | Image | Role |
|---|---|---|
| `db` | `postgres:15` | Database. Data persists in the `db_data` named volume. |
| `migrate` | built from the Dockerfile's `builder` stage | Runs the migrations once, then exits |
| `seed` | `postgres:15` | Runs `seed_base.sql` through `psql`, then exits |
| `backend` | built from the Dockerfile's final stage | The API |

Startup is ordered by `depends_on` conditions rather than by luck: `migrate` waits for
`db` to pass its `pg_isready` healthcheck, `seed` waits for `migrate` to exit
successfully, and `backend` waits on the same condition. A failed migration therefore
stops the stack instead of leaving the API serving against a stale schema.

`seed` reuses the `postgres` image rather than the application image, because `psql` is a
PostgreSQL client and does not exist in a Node image. It reaches the SQL file through a
read-only bind mount of `backend/scripts`.

| | Host port | Container port |
|---|---|---|
| API | 4001 | 4000 |
| PostgreSQL | 5433 | 5432 |

The host ports are chosen to avoid colliding with a local Node server and a local
PostgreSQL. Containers reach each other over the internal network on the *container*
ports — `db:5432` — regardless of what is published.

The Dockerfile is multi-stage. The `builder` stage installs every dependency and compiles
TypeScript; the final stage keeps only production dependencies and `dist/`, so the runtime
image ships without a compiler. `migrate` deliberately targets `builder`, because
`node-pg-migrate` is a devDependency and does not exist in the final image.

```bash
docker compose up -d
```

```bash
docker compose logs -f backend
```

`docker compose down` stops everything and keeps your data. `docker compose down -v` also
deletes the volume, which is how you force a genuinely fresh database — necessary if you
change `POSTGRES_USER` or `POSTGRES_PASSWORD`, since Postgres only reads those when the
volume is empty.

Seeding runs automatically. `seed_base.sql` is written to be idempotent — every insert is
guarded by `WHERE NOT EXISTS` — so re-running the stack neither fails nor duplicates rows.

One thing that misleads: the API logs `http://localhost:4000/` on startup. That is printed
from inside the container, where the app really is on 4000, and it knows nothing about the
port mapping. From your machine it is 4001. `NODE_ENV=production` is also set, so Apollo
serves its production landing page rather than Sandbox — the endpoint still answers POSTed
queries normally.

## Migrations

The schema is versioned as an ordered list of migration files in `src/migrations/`, rather
than a single schema script. `node-pg-migrate` keeps a `pgmigrations` table inside the
database itself, holding one row per migration that has been applied. On every run it
compares the files on disk against that table and applies only what is missing, in
timestamp order. The database therefore knows its own version, and the same command works
against a fresh database and an existing one.

Apply everything outstanding:

```bash
npm run migrate -- up
```

Roll back the most recent migration:

```bash
npm run migrate -- down
```

Create a new one:

```bash
npx node-pg-migrate create some-change -j ts -m src/migrations
```

Migrations live under `src/` deliberately, so `tsc --noEmit` type-checks them alongside the
rest of the code. All operations run inside a single transaction by default — a failure
part-way through rolls back completely, so the database is never left half-migrated.

**Don't write a `down` function.** When a migration exports only `up`, `node-pg-migrate`
replays the operation stack backwards to derive the reverse automatically, which is both
correct and self-maintaining. An exported empty `down` silently overrides that inference:
the rollback would remove the row from `pgmigrations` while leaving every table in place,
so the database would then disagree with its own version record.

**`--dry-run` cannot be passed through `npm run`.** npm claims that flag for itself and
drops it rather than forwarding it, even after `--`, so the migration runs for real. Call
the binary directly instead:

```bash
npx node-pg-migrate -m src/migrations --envPath .env down --dry-run
```

### Referential integrity

Delete behaviour is set explicitly on every foreign key rather than left to the default:

| Relationship | On delete | Reasoning |
|---|---|---|
| `readings` → `sensors` | `CASCADE` | A reading is meaningless without its sensor |
| `sensors` → `locations` | `RESTRICT` | A location holding sensors shouldn't be removable by accident |
| `locations` → `plants` | `RESTRICT` | Same, one level up |
| audit columns → `users` | `SET NULL` | Deleting a user shouldn't destroy the record they touched |

`CASCADE` on readings is what lets `deleteSensor` run as a single statement. Every
`SET NULL` sits on a nullable column — the combination of `NOT NULL` and `SET NULL` is
accepted at table-creation time but fails later, at the moment a referenced row is deleted.

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

## Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request against `master`:

| Step | What it proves |
|---|---|
| `npm ci` | The lockfile installs cleanly |
| `npm run migrate:up` | Every migration applies to an **empty** database |
| `psql -f seed_base.sql` | The seed runs |
| the same command again | The seed is idempotent |
| `npx tsc --noEmit` | The project compiles |
| `npm test` | Tests pass |
| `docker build` | The Dockerfile still works |

The migration step is the one that earns its place. Migrations are hand-written and only
ever applied forwards on a developer machine, so a mistake stays invisible until something
builds a database from scratch. CI does exactly that on every push, against a real
PostgreSQL service container.

Running the seed twice is a deliberate assertion, not a copy-paste error: `seed_base.sql`
executes on every `docker compose up`, so idempotency is a property it has to keep. The
check is partial, though — a missing guard fails loudly on `roles` and `users`, which have
`UNIQUE` constraints, but would silently duplicate rows on `plants`, `locations` and
`sensors`, which don't.

Two things behave differently from `docker-compose.yml`, both for the same reason — the
job runs *on* the runner rather than inside the container network:

- `DATABASE_URL` points at `localhost:5432`, not at a service name
- database credentials are inline throwaway values, not secrets; the service exists for
  the duration of the job and is unreachable from outside the runner

A commented-out BuildKit layer-cache block sits at the end of the workflow. It is off
deliberately: the cache has to be uploaded and downloaded on every run, which for an image
this size costs about as much as it saves.

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
│   ├── init.sql                    # Superseded by migrations — kept for reference only
│   └── seed_base.sql               # Base data
├── src/
│   ├── migrations/                 # Versioned schema changes, applied in timestamp order
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
├── Dockerfile                      # Multi-stage: builder, then a slim runtime
├── .dockerignore
├── codegen.yml
├── jest.config.js
└── tsconfig.json
docker-compose.yml                  # db + migrate + seed + backend
.github/workflows/ci.yml            # Type check, tests, migrations, image build
```

Three layers, each independent of the one above it: `db/` knows nothing about GraphQL,
and `analytics/` knows nothing about either — it takes plain data and returns plain data,
which is what keeps it testable without fixtures.

`scripts/init.sql` is no longer the source of truth and is not maintained. The schema it
describes predates the migration that replaced it, and the two have already diverged —
`init.sql` uses `TIMESTAMP` where the migration uses `TIMESTAMPTZ`, and leaves delete
behaviour at the default. Build databases with `npm run migrate -- up`, never from that
file.

## Roadmap

- [x] `detectAnomalies` — a pure function over readings, no database, no GraphQL
- [x] Anomaly queries in the schema
- [x] `src/scripts/simulate.ts` — generate realistic reading history
- [x] Jest test suite
- [x] Versioned schema migrations with node-pg-migrate
- [x] Docker + docker-compose, with automated migrations and seeding
- [x] GitHub Actions CI — type check, tests, migrations against a real Postgres
- [ ] Authentication (`sensors.created_by` is currently hardcoded)
- [ ] Angular 20 frontend with apollo-angular
- [ ] Continuous deployment
- [ ] Python agent for anomaly detection
