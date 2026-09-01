import sys

from anthropic import Anthropic

from sensor_agent import config
from sensor_agent.agent import run_agent
from sensor_agent.api import SensorApi


def main() -> None:
    question = " ".join(sys.argv[1:]) or input("Enter your question: ")

    client = Anthropic()
    api = SensorApi(config.GRAPHQL_URL, config.SENSOR_USERNAME, config.SENSOR_PASSWORD)

    print(run_agent(client, api, question))


if __name__ == "__main__":
    main()
