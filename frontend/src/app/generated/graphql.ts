/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Anomaly = {
  __typename?: 'Anomaly';
  deviation: Scalars['Float']['output'];
  readingId: Scalars['Int']['output'];
  timestamp: Scalars['String']['output'];
  value: Scalars['Float']['output'];
  zScore: Scalars['Float']['output'];
};

export type Location = {
  __typename?: 'Location';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  plantId: Scalars['Int']['output'];
  updatedAt: Scalars['String']['output'];
};

export type LoginResponse = {
  __typename?: 'LoginResponse';
  token: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addReading: Reading;
  createSensor: Sensor;
  deleteSensor: Scalars['Int']['output'];
  login: LoginResponse;
  updateSensor: Sensor;
};


export type MutationAddReadingArgs = {
  sensorId: Scalars['Int']['input'];
  value: Scalars['Float']['input'];
};


export type MutationCreateSensorArgs = {
  locationId: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  type: Scalars['String']['input'];
  unit: Scalars['String']['input'];
};


export type MutationDeleteSensorArgs = {
  id: Scalars['Int']['input'];
};


export type MutationLoginArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationUpdateSensorArgs = {
  id: Scalars['Int']['input'];
  locationId: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  type: Scalars['String']['input'];
  unit: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  anomalies: Array<Anomaly>;
  readings: Array<Reading>;
  sensor?: Maybe<Sensor>;
  sensors: Array<Sensor>;
};


export type QueryAnomaliesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  sensorId: Scalars['Int']['input'];
  threshold?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryReadingsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  sensorId: Scalars['Int']['input'];
};


export type QuerySensorArgs = {
  id: Scalars['Int']['input'];
};

export type Reading = {
  __typename?: 'Reading';
  id: Scalars['Int']['output'];
  recordedAt: Scalars['String']['output'];
  sensorId: Scalars['Int']['output'];
  value: Scalars['Float']['output'];
};

export type Sensor = {
  __typename?: 'Sensor';
  id: Scalars['Int']['output'];
  location: Location;
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
  unit: Scalars['String']['output'];
};

export type GetSensorsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSensorsQuery = { sensors: Array<{ id: number, name: string, location: { id: number, name: string } }> };


export const GetSensorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSensors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sensors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"location"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<GetSensorsQuery, GetSensorsQueryVariables>;