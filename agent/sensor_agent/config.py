import os
from dotenv import load_dotenv

load_dotenv()

GRAPHQL_URL = os.environ["GRAPHQL_URL"]
SENSOR_USERNAME = os.environ["SENSOR_USERNAME"]
SENSOR_PASSWORD = os.environ["SENSOR_PASSWORD"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
MODEL = os.environ["MODEL"]
MAX_TOKENS = int(os.environ["MAX_TOKENS"])