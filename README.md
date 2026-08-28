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
| Authentication | Working |
| Relations + DataLoader batching | Working |
| Docker + docker-compose | Working |
| GitHub Actions CI | Working |
| Angular frontend — auth, sensor CRUD, live readings, anomalies | Working |
| Continuous deployment | Not started |
| Python AI agent | Not started |

## Stack

**Backend**

- **Node.js 22** + **TypeScript** (strict, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`)
- **Apollo Server v5** — GraphQL runtime
- **PostgreSQL** via the raw `pg` driver — no ORM, SQL written by hand
- **node-pg-migrate** — versioned schema migrations, no ORM required
- **jsonwebtoken** + **bcrypt** — JWT authentication, hashed passwords
- **GraphQL Code Generator** — resolver types derived from the schema
- **DataLoader** — per-request batching for relation fields, no ORM required
- **Jest** + **ts-jest** — unit tests over the analysis layer
- **Docker** + **docker-compose** — the API, the database and the migration step as
  three containers
- **GitHub Actions** — type check, tests, migrations against a real Postgres, image build

**Frontend**

- **Angular 22** — standalone components, **zoneless** change detection, signals throughout
- **Signal Forms** (`@angular/forms/signals`) — the v22 forms API, not reactive forms
- **apollo-angular** + **Apollo Client 4** — normalized cache, polling, error link
- **GraphQL Code Generator** — query result types derived from the same live schema the
  backend generates its resolver types from
- **Vitest** — the v22 default test runner, replacing Karma
- **ESLint** (`angular-eslint`) — with the generated file excluded

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
| `JWT_SECRET` | Signing key for auth tokens. The app refuses to start without it. |

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

## Frontend

```bash
cd frontend
npm install
npm start
```

Served at **`http://localhost:4200/`**. The backend must be running on 4000 — the endpoint
comes from `src/environments/environment.development.ts`, swapped in by the `development`
build configuration.

Sign in with the seeded `admin` / `admin123`.

To watch readings arrive live, run the simulator alongside the dev server:

```bash
npm --prefix backend run simulate:live
```

That appends one reading every five seconds until interrupted, which is what the detail
page's five-second poll is there to pick up. `npm run simulate` is the other mode: it
deletes a sensor's readings and backfills 200 of them spaced two minutes apart, then
exits — useful for giving anomaly detection enough history to work with.

**Screens**

| Route | What it does |
|---|---|
| `/login` | The only unauthenticated route |
| `/sensors` | Sensor list |
| `/sensors/new` | Create a sensor |
| `/sensors/:id` | Detail — live readings, plus anomalies |
| `/sensors/:id/edit` | Edit a sensor |

Everything except `/login` sits under a shell route carrying `authGuard`, so new routes
nested there are protected by default rather than by remembering to add a guard.

**Regenerating query types**

```bash
npm run codegen
```

Same constraint as the backend: the dev server must be running, since the schema is read
over introspection. Both generators point at the same live schema, so a backend field
rename surfaces as a frontend compile error rather than a runtime surprise.

**Tests and lint**

```bash
npm test
```

```bash
npm run lint
```

14 tests. They assert that each component constructs — thin, but the `ApolloTestingModule`
harness is wired, so a real test is a matter of flushing a response and asserting on the
derived signals.

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

104 tests across 9 files, in about two seconds. **Nothing in the suite touches PostgreSQL
and nothing opens a socket** — the repository is mocked at the boundary, which is possible
only because `db/` takes plain values rather than request-scoped objects.

That boundary has a cost worth naming: the SQL strings in `db/repository.ts` are never
executed by anything, so a placeholder typo is invisible to all 104 tests and only shows up
when a real query runs.

| File | Covers |
|---|---|
| `analytics/detectAnomalies.test.ts` | Z-score detection: empty batches, zero-variance batches, invalid thresholds, samples too small for the threshold to be reachable |
| `auth/password.test.ts` | Hashing and comparison, random salts, and that an unusable stored hash returns false instead of throwing |
| `auth/token.test.ts` | Signing and verification, plus every rejection path: expired, wrong secret, malformed, and correctly signed tokens with a missing or non-numeric `userId` |
| `graphql/context.test.ts` | Header parsing, anonymous requests, and that a rejected token produces `UNAUTHENTICATED` with HTTP 401 |
| `graphql/guards.test.ts` | `requireUser` returns the id or throws |
| `graphql/loaders.test.ts` | Batching, deduplication, key ordering, and per-key rejection for missing ids |
| `graphql/errorHandling.test.ts` | Constraint-to-code mapping, which errors get logged, and that Postgres detail never reaches the client |
| `resolvers.test.ts` | Resolver logic against a mocked repository, including login |
| `schema.auth.test.ts` | Every field in the schema, driven through Apollo in-process |

Three of these assert properties that are otherwise invisible:

- **Nothing reaches the data layer on a rejected request.** `schema.auth.test.ts` runs all
  nine guarded fields anonymously and then asserts every repository function was never
  called. That's the difference between refusing a request and filtering results after the
  query has already run.
- **Postgres detail never leaks.** `errorHandling.test.ts` serialises the formatted error
  and asserts the constraint's `detail` string does not appear in it.
- **Bad credentials and a missing token share a code but not a message** — so a client can
  tell "log in" from "your password was wrong", while nothing reveals which half of the
  credentials failed.

`schema.auth.test.ts` is the one that earns its keep over time: it drives real operations
through `ApolloServer.executeOperation`, so a field added to `schema.ts` without a
`requireUser` guard fails the suite rather than shipping unprotected.

Two things worth knowing if you extend the suite:

`auth/token.ts` throws at import time when `JWT_SECRET` is missing, and imports are
hoisted — so setting the variable inside a test file is too late. `jest.setup.ts` sets it
via Jest's `setupFiles`, which runs before any test module loads.

Codegen marks arguments with schema defaults as **required** (`RequireFields<…, 'limit'>`),
because GraphQL fills defaults before a resolver runs. Calling a resolver directly in a
test means passing them explicitly.

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
| `npm test` | 104 tests pass, including that every schema field refuses anonymous callers |
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

Run codegen after any schema change, and before writing resolvers for new fields. Changing
the `Context` interface does **not** require it — `contextType` makes codegen emit an
import, so the generated types follow that interface at compile time.

`codegen.yml` also declares `mappers`, which is what makes field resolvers possible:

```yaml
mappers:
  Sensor: ../db/types#Sensor as SensorRow
  Location: ../db/types#Location as LocationRow
```

Without this, codegen assumes the object flowing between resolvers *is* the schema type —
so `Query.sensors` would have to return a `location` on every sensor, defeating the point
of resolving it lazily. `mappers` says the parent is the database row, and a field resolver
produces the rest.

The `as SensorRow` aliases are mandatory, not cosmetic. The generated file already declares
its own `Sensor` and `Location` types from the schema, so importing the row types under the
same names is a redeclaration:

```
error TS2440: Import declaration conflicts with local declaration of 'Sensor'.
```

That error creates a deadlock worth knowing about: `ts-node-dev` type-checks, so the dev
server won't start while the generated file is broken — and codegen needs the server
running to read the schema. Break it with `npx ts-node-dev --transpile-only src/index.ts`,
regenerate, then go back to the normal script.

## API

**Queries**

| Field | Returns |
|---|---|
| `sensors` | All sensors |
| `sensor(id)` | One sensor, or `null` if it doesn't exist |
| `locations` | All locations, ordered by name — backs the form's location picker |
| `Sensor.location` | The sensor's location, batched through DataLoader |
| `readings(sensorId, limit)` | Readings for a sensor, newest first (`limit` defaults to 10) |
| `anomalies(sensorId, limit, threshold)` | Readings more than `threshold` standard deviations from the mean of the last `limit` readings (`limit` defaults to 50, `threshold` to 3) |

**Mutations**

| Field | Returns |
|---|---|
| `createSensor(name, locationId, unit, type)` | The created sensor |
| `updateSensor(id, name, locationId, unit, type)` | The updated sensor |
| `deleteSensor(id)` | The deleted sensor's id |
| `addReading(sensorId, value)` | The created reading |
| `login(username, password)` | `{ token }` — the only field callable without a token |

Timestamps cross the wire as ISO 8601 strings.

**Every field except `login` requires authentication.** Send the token from `login` as
`Authorization: Bearer <token>`; without it the request is rejected with `UNAUTHENTICATED`.

## Relations and the N+1 problem

`Sensor.location` is a field resolver: it runs only when a query actually selects
`location`, so `{ sensors { name } }` never touches the `locations` table.

Resolved naively — one `getLocationById` per sensor — that costs one query per row.
Measured against 13 sensors:

| Query | Statements |
|---|---|
| `{ sensors { name } }` | 1 |
| `{ sensors { name location { name } } }` | **14** |

One to list the sensors, then one per sensor. The shape is `1 + N`, so a thousand sensors
means a thousand and one round trips for a single request. Twelve of those thirteen
lookups fetched a row that had already been fetched moments earlier.

**A join isn't the fix.** `Query.sensors` has no idea whether the client asked for
`location`, so joining eagerly would make `{ sensors { name } }` pay for data nobody
requested. The field resolver is right; what's missing is batching.

[`graphql/loaders.ts`](backend/src/graphql/loaders.ts) supplies it. Every `.load(id)` in
the same tick of the event loop is collected, deduplicated, and dispatched as one
`WHERE id = ANY($1)`:

```
with location  sensors=13  queries=2
   1. SELECT id, name, location_id AS "locationId", unit, type FROM sensors
   2. SELECT id, name, plant_id AS "plantId", description FROM locations WHERE id = ANY($1)
```

Two queries, and it stays two — more sensors just lengthen the array. The batching works
because `graphql-js` resolves sibling fields concurrently, so all thirteen `.load()` calls
land in the same tick. Resolve them sequentially and you are back to thirteen batches of
one.

**Loaders are created per request**, inside `createContext`, never at module scope. The
queue and the cache are the same object, so a module-level loader would keep its cache for
the lifetime of the process: an edited location would keep serving its old name until
restart, and every user would share one cache. A test asserts two contexts never share a
loader instance.

**The batch function has a contract that is easy to break.** DataLoader requires exactly
one entry per key, in key order. Postgres returns matching rows in arbitrary order and
simply omits ids it did not find, so the rows are re-mapped through a `Map` before being
returned. Skipping that gives you either a length-mismatch crash or — worse, and silently
— one sensor served another's location. Missing ids get a `NotFoundError` **value** in
their slot, which makes only that key's promise reject while its neighbours resolve.

## Authentication

Stateless JWT. `login` verifies a password against `users.password_hash` with bcrypt and
returns a signed token carrying the user id; every other field requires that token.

The seed creates one user — `admin` / `admin123`, for local development only. Tokens
expire after 24 hours — a development convenience, and the first thing to shorten before
this is exposed anywhere real.

On the frontend the token lives in `localStorage`, which survives a refresh at the cost of
being readable by any XSS. An acceptable trade for an internal dashboard; the alternative
is `httpOnly` cookies, which would mean the backend issuing a cookie rather than returning
a token, plus CORS with credentials.

```
auth/password.ts   hash / compare — pure, no I/O
auth/token.ts      sign / verify  — pure, no I/O
auth/errors.ts     domain errors
graphql/context.ts reads the header, produces { userId: number | null }
graphql/guards.ts  requireUser(context): number
```

`auth/` stays pure and knows nothing about HTTP or the database, so both modules unit-test
without fixtures. `context.ts` runs once per request and is the only place that touches the
`Authorization` header. Resolvers call `requireUser(context)`, which returns a `number` —
the return type is what narrows `number | null`, so no resolver repeats the null check.

`db/` never sees any of this. `createSensor` takes a plain `userId: number`, which is why
`scripts/simulate.ts` still works without inventing a fake request.

**Three deliberate details:**

`token.ts` throws at import time if `JWT_SECRET` is missing, rather than defaulting. A
signing key with a fallback value is worse than no key at all — everything appears to work
while anyone holding the default can forge tokens.

`verify` inspects the decoded payload at runtime instead of asserting its type. A valid
signature proves the token was issued by this server; it does not prove the payload still
has the shape the current code expects. A token issued an hour ago, after a field rename,
verifies fine and carries the wrong shape.

`login` compares against a dummy hash when the username doesn't exist, so a failed login
takes the same ~70ms either way. Returning early would let an attacker enumerate valid
usernames by timing alone.

**Where errors are born matters.** `auth/` raises plain domain errors, translated centrally
in `formatError`. But `context.ts` throws a `GraphQLError` directly — it has to, because
`formatError` shapes the response body while the HTTP status is read from the thrown
error's `extensions.http`. A domain error there would return `500` for an expired session.
Since `context.ts` is part of the GraphQL layer, speaking GraphQL is legitimate.

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
| No token sent | `UNAUTHENTICATED` |
| Token invalid or expired | `UNAUTHENTICATED`, HTTP 401 |
| Wrong username or password | `INVALID_CREDENTIALS` |
| Threshold out of range, or too few readings for it | `BAD_USER_INPUT` |
| Anything unrecognised | `INTERNAL_SERVER_ERROR` |

Bad credentials and a missing token carry **different codes**, which matters more than it
looks. The frontend's Apollo error link reacts to `UNAUTHENTICATED` by clearing the session
and redirecting to `/login`; if a wrong password shared that code, every failed login
attempt would trigger a logout-and-redirect instead of showing "wrong password". Neither
message reveals *which* of username or password failed.

`BAD_USER_INPUT` covers two cases on `anomalies`, distinguished by a `maxZScore` extension
present only on the second: a threshold outside `(0, 10]`, and a batch too small for the
threshold to be reachable at all. The second is routine — with the default threshold of 3
you need at least 11 readings — so the UI presents it as "not enough readings yet" rather
than as an error.

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
│   ├── auth/
│   │   ├── password.ts             # bcrypt hash / compare — pure
│   │   ├── password.test.ts
│   │   ├── token.ts                # JWT sign / verify — pure
│   │   ├── token.test.ts
│   │   └── errors.ts               # Auth domain errors
│   ├── graphql/
│   │   ├── context.ts              # Per-request auth context
│   │   ├── context.test.ts
│   │   ├── guards.ts               # requireUser
│   │   ├── guards.test.ts
│   │   ├── loaders.ts                # Per-request DataLoader batching
│   │   ├── loaders.test.ts
│   │   ├── errors.ts               # Constraint name to error code mapping
│   │   ├── errorHandling.ts        # Apollo formatError hook
│   │   └── errorHandling.test.ts
│   ├── generated/
│   │   └── types.ts                # Generated, do not edit by hand
│   ├── scripts/
│   │   └── simulate.ts             # Seeds a sensor with realistic reading history
│   ├── schema.ts                   # GraphQL type definitions
│   ├── schema.auth.test.ts         # Every field refuses an anonymous caller
│   ├── resolvers.ts                # Resolvers, typed via `satisfies Resolvers`
│   ├── resolvers.test.ts
│   └── index.ts                    # Entry point
├── Dockerfile                      # Multi-stage: builder, then a slim runtime
├── .dockerignore
├── codegen.yml
├── jest.config.js
├── jest.setup.ts                   # Sets JWT_SECRET before test modules load
└── tsconfig.json
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth/
│   │   │   │   ├── session.ts          # Token state — no dependencies at all
│   │   │   │   ├── auth-api.ts         # The login mutation
│   │   │   │   ├── auth-interceptor.ts # Attaches the Bearer header
│   │   │   │   ├── auth-guard.ts       # authGuard + guestGuard
│   │   │   │   ├── decode-jwt.ts       # Reads `exp` — never verifies
│   │   │   │   └── graphql/
│   │   │   └── graphql/
│   │   │       └── error-link.ts       # UNAUTHENTICATED → clear session, redirect
│   │   ├── layout/
│   │   │   ├── shell/                  # Header + router-outlet, carries authGuard
│   │   │   └── header/                 # Brand + logout
│   │   ├── login/
│   │   ├── sensors/
│   │   │   ├── graphql/                # Every document for the feature
│   │   │   ├── sensors-api.ts          # One service, all sensor operations
│   │   │   ├── numeric-id-guard.ts     # Rejects non-numeric :id
│   │   │   ├── sensors-list/
│   │   │   ├── sensor-detail/
│   │   │   ├── sensor-anomalies/       # Own query, own states
│   │   │   └── sensor-form/            # Create and edit share one component
│   │   ├── generated/
│   │   │   └── graphql.ts              # Generated, do not edit by hand
│   │   ├── app.config.ts               # Providers: router, http, Apollo link chain
│   │   └── app.routes.ts
│   ├── environments/                   # graphqlUrl, swapped by build configuration
│   └── styles.scss                     # --app-* design tokens, light and dark
├── codegen.yml
└── eslint.config.js
docker-compose.yml                  # db + migrate + seed + backend
.github/workflows/ci.yml            # Type check, tests, migrations, image build
```

The frontend mirrors the backend's layering: `core/auth/session.ts` has no dependencies —
not Apollo, not Router — which is what lets the interceptor inject it without a circular
reference. Each feature owns its `graphql/` folder, its components, and one API service.

Each layer is independent of the one above it: `db/` knows nothing about GraphQL, and
`analytics/` and `auth/` know nothing about either — they take plain data and return plain
data, which is what keeps them testable without fixtures. Only `graphql/` is allowed to
import from all of them.

`scripts/init.sql` is no longer the source of truth and is not maintained. The schema it
describes predates the migration that replaced it, and the two have already diverged —
`init.sql` uses `TIMESTAMP` where the migration uses `TIMESTAMPTZ`, and leaves delete
behaviour at the default. Build databases with `npm run migrate -- up`, never from that
file.

## Roadmap

- [x] `detectAnomalies` — a pure function over readings, no database, no GraphQL
- [x] Anomaly queries in the schema
- [x] `src/scripts/simulate.ts` — generate realistic reading history
- [x] Jest test suite — 104 tests, no database and no socket
- [x] Versioned schema migrations with node-pg-migrate
- [x] Docker + docker-compose, with automated migrations and seeding
- [x] GitHub Actions CI — type check, tests, migrations against a real Postgres
- [x] JWT authentication — every field except `login` requires a token
- [x] `Sensor.location` field resolver, N+1 solved with per-request DataLoader
- [x] Angular 22 frontend — zoneless, signals, apollo-angular
- [x] Login, route guards, and a centralised Apollo error link for expired sessions
- [x] Sensor list and detail, with five-second polling for live readings
- [x] Anomalies on the detail page, with "not enough readings" as its own state
- [x] Sensor create and edit with Signal Forms
- [ ] Delete a sensor, with confirmation
- [ ] A toast service — mutation feedback and redirect reasons
- [ ] `me` query, so the header can show who is signed in
- [ ] Real frontend tests — flush a response, assert the derived signals
- [ ] Pause polling while the tab is hidden
- [ ] Continuous deployment
- [ ] Python agent for anomaly detection
