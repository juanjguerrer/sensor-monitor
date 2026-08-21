export const typeDefs = `#graphql
  type Sensor {
    id: Int!
    name: String!
    locationId: Int!
    unit: String!
    type: String!
  }

  type Query {
    sensors: [Sensor!]!,
    sensor(id: Int!): Sensor
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

  extend type Query {
    readings(sensorId: Int!, limit: Int = 10): [Reading!]!
  }

  extend type Mutation {
    addReading(sensorId: Int!, value: Float!): Reading!
  }
`;