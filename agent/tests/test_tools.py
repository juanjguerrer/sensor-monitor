import json

from sensor_agent.tools import (
    DISPATCH,
    MAX_READINGS,
    TOOLS,
    get_sensor_anomalies,
    get_sensor_readings,
    list_sensors,
)


class FakeApi:
    """Stands in for SensorApi. Records the last call and returns canned data."""

    def __init__(self, data: dict | None = None):
        self.data: dict = data if data is not None else {}
        self.query: str | None = None
        self.raw_variables: dict | None = None
        self.calls = 0

    def execute(self, query: str, variables: dict | None = None) -> dict:
        self.query = query
        self.raw_variables = variables
        self.calls += 1
        return self.data

    @property
    def variables(self) -> dict:
        """The variables of the last call, asserting there were some."""
        assert self.raw_variables is not None, "execute() was called without variables"
        return self.raw_variables


def test_list_sensors_returns_json_string():
    api = FakeApi({"sensors": [{"id": 1, "name": "Sensor 1"}]})

    result = list_sensors(api)

    assert isinstance(result, str)
    assert json.loads(result) == {"sensors": [{"id": 1, "name": "Sensor 1"}]}


def test_list_sensors_sends_no_variables():
    api = FakeApi()

    list_sensors(api)

    assert api.raw_variables is None


def test_readings_maps_sensor_id_to_graphql_name():
    api = FakeApi({"readings": []})

    get_sensor_readings(api, sensor_id=7)

    assert api.variables["sensorId"] == 7
    assert "sensor_id" not in api.variables


def test_readings_uses_default_limit():
    api = FakeApi({"readings": []})

    get_sensor_readings(api, sensor_id=1)

    assert api.variables["limit"] == 10


def test_readings_clamps_limit():
    api = FakeApi({"readings": []})

    get_sensor_readings(api, sensor_id=1, limit=5000)

    assert api.variables["limit"] == MAX_READINGS


def test_readings_leaves_small_limit_alone():
    api = FakeApi({"readings": []})

    get_sensor_readings(api, sensor_id=1, limit=5)

    assert api.variables["limit"] == 5


def test_anomalies_maps_names_and_defaults():
    api = FakeApi({"anomalies": []})

    get_sensor_anomalies(api, sensor_id=26)

    assert api.variables["sensorId"] == 26
    assert api.variables["limit"] == 50
    assert api.variables["threshold"] == 3.0


def test_anomalies_clamps_limit():
    api = FakeApi({"anomalies": []})

    get_sensor_anomalies(api, sensor_id=1, limit=5000)

    assert api.variables["limit"] == MAX_READINGS


def test_anomalies_returns_json_string():
    api = FakeApi({"anomalies": []})

    result = get_sensor_anomalies(api, sensor_id=1)

    assert isinstance(result, str)
    assert json.loads(result) == {"anomalies": []}


def test_every_tool_schema_has_a_dispatch_entry():
    schema_names = {tool["name"] for tool in TOOLS}

    assert schema_names == set(DISPATCH)


def test_tool_schemas_are_well_formed():
    for tool in TOOLS:
        assert tool["name"]
        assert tool["description"]
        assert tool["input_schema"]["type"] == "object"
        assert "properties" in tool["input_schema"]


def test_dispatch_accepts_model_style_keyword_arguments():
    """Claude sends input as a dict expanded with **, so schema property
    names must match the function parameter names exactly."""
    api = FakeApi({"readings": []})
    model_input = {"sensor_id": 3, "limit": 5}

    DISPATCH["get_sensor_readings"](api, **model_input)

    assert api.variables == {"sensorId": 3, "limit": 5}
