# Sensor Monitor Agent

An LLM tool-calling agent that inspects the sensor fleet and writes a plain-language
report. Claude decides which sensors to look at and which tools to call; this package
only supplies the tools and runs the loop.

It reads through the project's GraphQL API — not the database — so it works against a
deployed instance without database credentials. All tools are **read-only**: there is no
way for the model to create, update, or delete anything.

## Requirements

- Python 3.12
- A running `sensor-monitor` backend (local or deployed)
- An Anthropic API key with credits — billed separately from any Claude subscription.
  Create one at [console.anthropic.com](https://console.anthropic.com).

## Setup

From the `agent/` directory:

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill it in:

| Variable            | Meaning                                              |
| ------------------- | ---------------------------------------------------- |
| `GRAPHQL_URL`       | Backend GraphQL endpoint, e.g. `http://localhost:4000/graphql` |
| `SENSOR_USERNAME`   | Username for the backend `login` mutation            |
| `SENSOR_PASSWORD`   | Password for the same user                           |
| `ANTHROPIC_API_KEY` | Anthropic API key                                    |
| `MODEL`             | Model id, e.g. `claude-opus-5`                       |
| `MAX_TOKENS`        | Max output tokens per request, e.g. `10000`          |

Every variable is required. A missing one fails at import with a `KeyError` naming it,
before any request is sent.

## Usage

Run from the `agent/` directory:

```bash
python -m sensor_agent "Write a health report for all sensors."
```

With no argument it prompts interactively:

```bash
python -m sensor_agent
```

### Example

```
$ python -m sensor_agent "Write a health report for all sensors."

**Sensor 1 (Temperature, Location 1)** — Attention Required
One significant anomaly detected: a reading of 100 °C on August 22 at 19:13
(z-score 4.09). Recent readings cluster around 33–73 °C with typical values in the
50–60 °C range.

**Sensor 2 (Volume, Location 1)** — No data
No readings recorded. Unable to assess anomalies without data.
```

## How it works

```
__main__.py   CLI entry — reads the question, builds the clients, prints the answer
agent.py      the system prompt and the tool-calling loop
tools.py      GraphQL query documents, tool schemas, and the name → function dispatch
api.py        GraphQL client — login, token caching, request/error handling
config.py     loads .env into module-level constants
```

The loop sends the question plus the tool schemas to Claude, executes whatever tools it
asks for, feeds the results back, and repeats until Claude answers instead of calling a
tool. It is capped at 10 turns.

Authentication is handled inside `api.py`: it calls the `login` mutation on first use and
caches the JWT in memory for the process lifetime. Nothing above `api.py` knows a token
exists.

The GraphQL API returns failed queries as HTTP 200 with an `errors` array, so `api.py`
checks that array explicitly and raises `ApiError`. Tool failures are returned to Claude
as `is_error` tool results rather than crashing the run, which lets it recover — for
example by retrying with a larger `limit` when a sensor has too few readings for the
requested z-score threshold.

### Tools available to the model

| Tool                   | Returns                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `list_sensors`         | Every sensor with id, name, unit, and location                  |
| `get_sensor_readings`  | Recent readings for one sensor, newest first (default 10)       |
| `get_sensor_anomalies` | Readings whose z-score exceeds a threshold (default 3)          |

Anomaly detection itself lives in the backend (`detectAnomalies`), not here.

## Cost

A typical run is a handful of requests totalling tens of thousands of input tokens —
cents per run at Opus pricing. Set `MODEL=claude-haiku-4-5` for cheaper iteration while
tuning prompts.
