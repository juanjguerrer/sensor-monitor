import sys

import httpx
from anthropic import Anthropic

from sensor_agent import config
from sensor_agent.agent import run_agent
from sensor_agent.api import AuthError, SensorApi


def main() -> None:
    question = " ".join(sys.argv[1:]) or input("Enter your question: ")

    client = Anthropic()
    api = SensorApi(config.GRAPHQL_URL, config.SENSOR_USERNAME, config.SENSOR_PASSWORD)

    try:
        print(run_agent(client, api, question))
    except AuthError as e:
        sys.exit(f"Could not authenticate against {config.GRAPHQL_URL}: {e}")
    except httpx.HTTPError as e:
        sys.exit(f"Could not reach the sensor API at {config.GRAPHQL_URL}: {e}")


if __name__ == "__main__":
    main()
