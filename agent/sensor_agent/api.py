import httpx

class ApiError(Exception):
  pass

class SensorApi:
  def __init__(self, url, username, password):
    self.url = url
    self.username = username
    self.password = password
    self.token = None
    self.client = httpx.Client(timeout=httpx.Timeout(60.0, connect=10.0))

  def _login(self):
    mutation = """
    mutation Login($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        token
      }
    }
    """
    variables = {
      "username": self.username,
      "password": self.password
    }
    data = self._post(mutation, variables)
    self.token = data["login"]["token"]
  def _token_header(self):
    if not self.token:
      self._login()
    return {"Authorization": f"Bearer {self.token}"}
  def execute(self, query, variables=None):
    headers = self._token_header()
    return self._post(query, variables, headers)

  def _post(self, query, variables=None, headers=None):
    response = self.client.post(self.url, json={"query": query, "variables": variables}, headers=headers)
    response.raise_for_status()
    body = response.json()
    if body.get("errors"):
      error_message = body["errors"][0]["message"]
      raise ApiError(error_message)
    return body["data"]