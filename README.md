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
| Continuous deployment | Working — Render, gated on CI checks |
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
- **Docker** + **docker-compose** — database, migrations, seed, API and web server as
  five containers
- **GitHub Actions** — type check, tests, migrations against a real Postgres, image build

**Frontend**

- **Angular 22** — standalone components, **zoneless** change detection, signals throughout
- **Signal Forms** (`@angular/forms/signals`) — the v22 forms API, not reactive forms
- **apollo-angular** + **Apollo Client 4** — normalized cache, polling, error link
- **GraphQL Code Generator** — query result types derived from the same live schema the
  backend generates its resolver types from
- **Vitest** — the v22 default test runner, replacing Karma
- **ESLint** (`angular-eslint`) — with the generated file excluded
- **nginx** — serves the production build and proxies the API onto the same origin

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

That builds both images, starts Postgres, waits for it to become healthy, runs the
migrations, seeds the base data, and only then starts the API and the web server.

| | URL |
|---|---|
| App | **`http://localhost:8080/`** |
| API | **`http://localhost:4001/`** |

Sign in with `admin` / `admin123`. In the containerized stack the app talks to the API
through nginx on 8080, not to 4001 directly — 4001 is published so you can reach the API
with Sandbox or curl.

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
psql -d sensor_monitor -v admin_password=admin123 -f scripts/seed_base.sql
```

The seed takes the admin password as a psql variable and hashes it with bcrypt
through `pgcrypto`, so no password or hash is committed. Omit the variable and the
script refuses to run rather than inserting a literal string as someone's password.

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

**Polling stops when the tab is hidden.** A root `Visibility` service exposes a signal fed
by `document.visibilitychange`, and both polling components feed it into their query chain
alongside the route id — so hiding the tab rebuilds the query with `pollInterval: 0` and
showing it rebuilds with the interval from `environment.pollIntervalMs` (5s in development,
30s in production, since real sensors write far slower than the simulator).

Those two queries also set **`fetchPolicy: 'cache-and-network'`**, and that is not
incidental. Rebuilding a query on the way back means a fresh `watchQuery`, and under the
default `cache-first` Apollo answers it from the cache and never reaches the network — so
returning to the tab would show stale data until the next poll tick. The bug is
asymmetrical enough to be genuinely confusing: `GetAnomalies` appeared to refresh correctly
while `GetSensorDetail` did not, purely because the anomalies query's previous result had
been an error, and errors are never cached, so it had nothing to serve. Returning to a tab
is exactly when a monitor should refresh, which is what `cache-and-network` buys.

**Two ways a session ends, and they arrive differently.** A *missing* token means
`createContext` returns `userId: null` and a resolver's `requireUser` throws — HTTP 200
with an `errors` array. An *invalid or expired* token makes `createContext` throw with
`http: { status: 401 }`, so there is no GraphQL envelope at all. Apollo surfaces the first
as `CombinedGraphQLErrors` and the second as `ServerError`, so the error link has to check
for both or expired sessions hang silently.

`Session.isAuthenticated()` is a plain method rather than a `computed`, deliberately. It
compares the token's `exp` against `Date.now()`, and `Date.now()` is not a signal — a
computed would cache the answer until the token itself changed, happily reporting a
session valid long after it expired. The guard clears the dead token before redirecting, so
the interceptor stops attaching it; the error link's 401 branch remains the backstop for a
token that dies between the guard passing and the response arriving.

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

26 tests across 16 files. Most assert that a component constructs, but three specs —
`sensors-list`, `sensor-detail` and `sensor-anomalies` — drive real behaviour:
`ApolloTestingModule` replaces the HTTP link with a queue, the test flushes a response, and
the assertions run against the rendered DOM rather than the component's internals.

Those three exist because each screen has four or five states that an empty result cannot
tell apart. The assertions that earn their place are the negative ones:

- **Detail** — a `null` sensor must render "not found" and *no* `role="alert"`, since
  `sensor()` is `null` for loading, for failure, and for genuinely missing.
- **Anomalies** — a `BAD_USER_INPUT` error carrying `maxZScore` must render "not enough
  readings" and *no* alert, while any other error must render the alert. `error()` is
  truthy in both cases, so the template's branch order is the only thing separating them —
  reorder those two branches and the test fails.

`controller.verify()` in `afterEach` asserts nothing was left unflushed, which is what
catches a component quietly issuing a query you didn't expect. The detail spec relies on
that: `<app-sensor-anomalies>` only mounts once a sensor loads, so its query appears in the
success test and in neither of the failure tests.

## Docker

Five services, defined in `docker-compose.yml`:

| Service | Image | Role |
|---|---|---|
| `db` | `postgres:15` | Database. Data persists in the `db_data` named volume. |
| `migrate` | built from the backend Dockerfile's `builder` stage | Runs the migrations once, then exits |
| `seed` | `postgres:15` | Runs `seed_base.sql` through `psql`, then exits |
| `backend` | built from the backend Dockerfile's final stage | The API |
| `frontend` | built from the frontend Dockerfile — nginx | Serves the built app and proxies the API |

Startup is ordered by `depends_on` conditions rather than by luck: `migrate` waits for
`db` to pass its `pg_isready` healthcheck, `seed` waits for `migrate` to exit
successfully, and `backend` waits on the same condition. A failed migration therefore
stops the stack instead of leaving the API serving against a stale schema.

`seed` reuses the `postgres` image rather than the application image, because `psql` is a
PostgreSQL client and does not exist in a Node image. It reaches the SQL file through a
read-only bind mount of `backend/scripts`.

| | Host port | Container port |
|---|---|---|
| Frontend | 8080 | 80 |
| API | 4001 | 4000 |
| PostgreSQL | 5433 | 5432 |

The host ports are chosen to avoid colliding with `ng serve`, a local Node server and a
local PostgreSQL. Containers reach each other over the internal network on the *container*
ports — `db:5432`, `backend:4000` — regardless of what is published. Only the left-hand
side can conflict; three containers could all listen on 80 internally without noticing
each other.

Both Dockerfiles are multi-stage. The backend's `builder` stage installs every dependency
and compiles TypeScript; the final stage keeps only production dependencies and `dist/`, so
the runtime image ships without a compiler. `migrate` deliberately targets `builder`,
because `node-pg-migrate` is a devDependency and does not exist in the final image.

The frontend builds with Node and ships on **nginx** — the runtime image contains no
JavaScript toolchain at all, just static files and a web server.

### The frontend proxy

`environment.ts` sets `graphqlUrl` to the relative `/graphql`, and `nginx.conf` is what
makes that true: it forwards `/graphql` to `backend:4000`. The browser therefore sees a
**single origin** for both the app and the API, so CORS never enters the picture — unlike
development, where 4200 and 4000 are different origins.

The trailing slash in `proxy_pass http://backend:4000/;` is load-bearing. With it, nginx
replaces the matched `/graphql` prefix with `/`, which is where the API actually lives.
Without it the path is appended and every request 404s.

The other rule that matters is the SPA fallback:

```nginx
try_files $uri $uri/ /index.html;
```

Without it, `/sensors/3` asks nginx for a file of that name, doesn't find one, and returns
404 — deep links and refresh break. It never shows up in development because `ng serve`
answers every path with `index.html` already.

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

That guard has a sharp edge worth knowing: it keys on "does a row with this name exist",
so it can never *correct* a row it didn't write. A volume carrying an `admin` user seeded
by an older version of the file keeps that user forever, and the fixed seed silently skips
it — which looks exactly like wrong credentials. `docker compose down -v` is the way out.

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

## Deployment

Hosted on Render as three pieces: a managed Postgres, the API as a Docker web service, and
the frontend as a static site.

| Piece | Type | Notes |
|---|---|---|
| Database | Managed Postgres | Free plan — **expires 30 days after creation** |
| API | Web Service, Docker | Root directory `backend`, builds the existing Dockerfile |
| Frontend | Static Site | Root `frontend`, build `npm ci && npm run build`, publish `dist/frontend/browser` |

Deploys are gated on CI: Render's auto-deploy is set to **After CI Checks Pass**, so a push
that fails lint or tests never reaches production. That is configured in Render rather than
in the workflow — the alternative, a deploy hook called from a final Actions job, needs
secrets and can only report that a deploy *started*.

### The frontend is a static site, not the nginx container

`frontend/Dockerfile` and `nginx.conf` are used by **Compose only**. Render serves the built
files directly and does the same two jobs through its own redirect rules:

| Source | Destination | Type |
|---|---|---|
| `/graphql` | the API's `.onrender.com` URL | Rewrite |
| `/*` | `/index.html` | Rewrite |

Rewrite, not redirect — a redirect would send the browser to the API's own origin and bring
CORS back. The second rule is the SPA fallback, the same job as nginx's `try_files`.

`environment.ts` needs no deployment-specific value: `graphqlUrl` is the relative
`/graphql`, which both nginx and Render's rewrite make true.

### Migrations are manual

Render's Pre-Deploy Command is a paid feature, so migrations do **not** run on deploy. Run
them from your machine against the **external** connection string before deploying a change
that needs them:

```bash
npx node-pg-migrate up -m src/migrations
```

with `DATABASE_URL` set in the shell. Two details, both of which fail confusingly:

**Append `?sslmode=require`.** Render's external endpoint demands SSL and `pg` will not
offer it unless told. Without it the connection is reset and you get `ECONNRESET`, which
mentions nothing about TLS. The **internal** URL the API uses must *not* have it — that
traffic never leaves Render's network.

**Do not use `npm run migrate:up` for this.** That script passes `--envPath .env`, which
loads `backend/.env` and its `localhost` connection string. The failure mode is migrating
your local database while believing you migrated production.

### Seeding

Once, by hand, with a real password:

```bash
psql "<external-url>?sslmode=require" -v admin_password='...' -f scripts/seed_base.sql
```

`INSERT 0 1` on the user row is the line to check. `INSERT 0 0` means a user named `admin`
already exists and yours was skipped — the seed's `WHERE NOT EXISTS` guard cannot correct a
row it did not write.

### Two things that will catch you out

**A push that touches only one directory does not rebuild the other service.** Render skips
builds when nothing changed under a service's root directory. Change something in `backend/`
and push only frontend files, and the API keeps running the previous image — which surfaces
as behaviour that contradicts the source. This cost an hour: the API was still running a
build from before `pool.ts` learned to read `DATABASE_URL`, so it fell back to `pg`'s
default host and reported `ECONNREFUSED 127.0.0.1:5432`. Manual Deploy is the fix.

**`frontend/.node-version` is load-bearing.** Render's build image ships a Node older than
Angular 22 accepts, and the build fails on the CLI's version check. The file pins it, and
`nvm`/`fnm` read the same file locally. The API is unaffected — its Node version is pinned
inside the Dockerfile, which is the trade for containerising one half and not the other.

### Environment variables on the API service

| Variable | Value |
|---|---|
| `DATABASE_URL` | the **internal** connection string, no `sslmode` |
| `JWT_SECRET` | generated fresh — not the one from your local `.env` |
| `NODE_ENV` | `production` |

`pool.ts` throws at import when `DATABASE_URL` is missing, so a misconfigured service
crash-loops on startup rather than failing on the first query.

### Free-tier consequences

The API sleeps when idle, so the first request after a quiet period takes roughly thirty
seconds. Static sites do not sleep, so the app loads instantly and then appears to hang on
login — which looks like a bug and is not one.

The database expiry is the one with a deadline. Moving to another provider is a single
`DATABASE_URL` change, then migrations and a re-seed: `pool.ts` takes a connection string
and nothing else in the codebase knows where the database lives.

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
| `me` | The signed-in user. Never null: `requireUser` throws for an anonymous caller |
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
| `login(username, password)` | `{ token, user }` — the only field callable without a token |

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

The seed creates one user, `admin`, whose password comes from `ADMIN_PASSWORD` in the
environment and is hashed with bcrypt by `pgcrypto` at seed time — no password or hash is
committed, and Compose refuses to start if the variable is unset. Locally that is
`admin123`; a deployment sets its own.

Tokens expire after 24 hours — a development convenience, and the first thing to shorten
before this is exposed anywhere real. There is no refresh mechanism and no revocation.

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
│   │   │   ├── graphql/
│   │   │   │   └── error-link.ts       # UNAUTHENTICATED → clear session, redirect
│   │   │   └── toast/
│   │   │       ├── toaster.ts          # Holds the messages; outlives navigation
│   │   │       └── toasts/             # Renders them, mounted at the root
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
├── Dockerfile                          # Node builds, nginx serves
├── nginx.conf                          # /graphql proxy + SPA fallback
├── codegen.yml
└── eslint.config.js
docker-compose.yml                  # db + migrate + seed + backend + frontend
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
- [x] Delete a sensor, with confirmation and cache eviction
- [x] A toast service — mutation feedback and redirect reasons
- [x] Frontend tests that flush responses and assert what renders
- [x] `me` query, and the user returned by `login` so the header needs no follow-up request
- [x] ESLint on both halves, wired into CI
- [x] The frontend served by nginx in Docker, with the API proxied onto the same origin
- [x] Pause polling while the tab is hidden
- [x] Continuous deployment — Render, gated on CI checks
- [ ] Continuous deployment
- [ ] Python agent for anomaly detection
