export const typeDefs = `#graphql
  type Sensor {
    id: Int!
    name: String!
    unit: String!
    type: String!
    location: Location!
  }

  type Location {
    id: Int!
    name: String!
    plantId: Int!
    description: String
    updatedAt: String!
  }

  type Query {
    sensors: [Sensor!]!,
    sensor(id: Int!): Sensor,
    locations: [Location!]!
  }

  type Mutation {
    createSensor(name: String!, locationId: Int!, unit: String!, type: String!): Sensor!,
    updateSensor(id: Int!, name: String!, locationId: Int!, unit: String!, type: String!): Sensor!,
    deleteSensor(id: Int!): Int!
  }

  type Reading {
    id: Int!
    sensorId: Int!
    value: Float!
    recordedAt: String!
  }
  type Anomaly {
    readingId: Int!
    timestamp: String!
    value: Float!
    deviation: Float!
    zScore: Float!
  }

  extend type Query {
    readings(sensorId: Int!, limit: Int = 10): [Reading!]!
    anomalies(sensorId: Int!, limit: Int = 50, threshold: Float = 3): [Anomaly!]!
  }

  extend type Mutation {
    addReading(sensorId: Int!, value: Float!): Reading!
  }

  type LoginResponse {
    token: String!
  }

  extend type Mutation {
    login(username: String!, password: String!): LoginResponse!
  }
`;