from sensor_agent.api import SensorApi
import json
from anthropic.types import ToolParam

MAX_READINGS = 200
SENSORS_QUERY = """
  query GetSensors {
    sensors {
      id
      name
      unit
      location {
        id
        name
      }
    }
  }
"""

SENSOR_READINGS_QUERY = """
  query GetSensorReadings($sensorId: Int!, $limit: Int) {
    readings(sensorId: $sensorId, limit: $limit) {
      id
      value
      recordedAt
    }
  }
  """

SENSOR_ANOMALIES_QUERY = """
  query GetAnomalies($sensorId: Int!, $limit: Int, $threshold: Float) {
      anomalies(sensorId: $sensorId, limit: $limit, threshold: $threshold) {
        readingId
        timestamp
        value
        zScore
        deviation
      }
    }
"""

LIST_SENSORS_TOOL : ToolParam = {
  "name": "list_sensors",
  "description": "List all sensors with their IDs, names, units, and locations with their respective IDs and names.",
  "input_schema": {
    "type": "object",
    "properties": { },
  },
}

SENSOR_READINGS_TOOL : ToolParam = {
  "name": "get_sensor_readings",
  "description": "Retrieve readings for a specific sensor by its ID. The readings include the reading ID, value, and the timestamp when it was recorded. Newest first. The number of readings returned can be limited by the 'limit' parameter.",
  "input_schema": {
    "type": "object",
    "properties": {
      "sensor_id": {"type": "integer", "description": "The ID of the sensor to retrieve readings for."},
      "limit": {"type": "integer", "description": "The number of readings to retrieve. Defaults to 10.", "default": 10},
    },
    "required": ["sensor_id"],
  },
}

SENSOR_ANOMALIES_TOOL : ToolParam = {
  "name": "get_sensor_anomalies",
  "description": "Retrieve anomalies for a specific sensor by its ID. Anomalies are readings that deviate significantly from the expected range, based on a z-score threshold. If the response is empty, it means there are no anomalies for the given sensor ID and threshold.",
  "input_schema": {
    "type": "object",
    "properties": {
      "sensor_id": {"type": "integer", "description": "The ID of the sensor to retrieve anomalies for."},
      "limit": {"type": "integer", "description": "The number of readings to retrieve. Defaults to 50.", "default": 50},
      "threshold": {"type": "number", "description": "The z-score threshold for determining anomalies. Readings with a z-score above this value will be considered anomalies.", "default": 3.0},
    },
    "required": ["sensor_id"],
  },
}

def list_sensors(api: SensorApi) -> str:
    sensors_data = api.execute(SENSORS_QUERY)
    return json.dumps(sensors_data)

def get_sensor_readings(api: SensorApi, sensor_id: int, limit: int = 10) -> str:
    limit = min(limit, MAX_READINGS)
    readings_data = api.execute(SENSOR_READINGS_QUERY, variables={"sensorId": sensor_id, "limit": limit})
    return json.dumps(readings_data)

def get_sensor_anomalies(api: SensorApi, sensor_id: int, limit: int = 50, threshold: float = 3.0) -> str:
    limit = min(limit, MAX_READINGS)
    anomalies_data = api.execute(SENSOR_ANOMALIES_QUERY, variables={"sensorId": sensor_id, "limit": limit, "threshold": threshold})
    return json.dumps(anomalies_data)

TOOLS = [ LIST_SENSORS_TOOL, SENSOR_READINGS_TOOL, SENSOR_ANOMALIES_TOOL ]
DISPATCH = {"list_sensors": list_sensors, "get_sensor_readings": get_sensor_readings, "get_sensor_anomalies": get_sensor_anomalies}

if __name__ == "__main__":
    from sensor_agent.api import SensorApi
    from sensor_agent import config
    api = SensorApi(config.GRAPHQL_URL, config.SENSOR_USERNAME, config.SENSOR_PASSWORD)
    sensors_json = list_sensors(api)
    print(sensors_json)
    sensor_id = json.loads(sensors_json)["sensors"][0]["id"] if json.loads(sensors_json)["sensors"] else 1
    print(get_sensor_readings(api, sensor_id=sensor_id, limit=5))
    print(get_sensor_anomalies(api, sensor_id=sensor_id))