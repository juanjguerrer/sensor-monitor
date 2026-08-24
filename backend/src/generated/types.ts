import { GraphQLResolveInfo } from 'graphql';
import { Sensor as SensorRow, Location as LocationRow } from '../db/types';
import { Context } from '../graphql/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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
  locationId: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
  unit: Scalars['String']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Anomaly: ResolverTypeWrapper<Anomaly>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Location: ResolverTypeWrapper<LocationRow>;
  LoginResponse: ResolverTypeWrapper<LoginResponse>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Reading: ResolverTypeWrapper<Reading>;
  Sensor: ResolverTypeWrapper<SensorRow>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Anomaly: Anomaly;
  Boolean: Scalars['Boolean']['output'];
  Float: Scalars['Float']['output'];
  Int: Scalars['Int']['output'];
  Location: LocationRow;
  LoginResponse: LoginResponse;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  Reading: Reading;
  Sensor: SensorRow;
  String: Scalars['String']['output'];
};

export type AnomalyResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Anomaly'] = ResolversParentTypes['Anomaly']> = {
  deviation?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  readingId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  zScore?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type LocationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  plantId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type LoginResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LoginResponse'] = ResolversParentTypes['LoginResponse']> = {
  token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  addReading?: Resolver<ResolversTypes['Reading'], ParentType, ContextType, RequireFields<MutationAddReadingArgs, 'sensorId' | 'value'>>;
  createSensor?: Resolver<ResolversTypes['Sensor'], ParentType, ContextType, RequireFields<MutationCreateSensorArgs, 'locationId' | 'name' | 'type' | 'unit'>>;
  deleteSensor?: Resolver<ResolversTypes['Int'], ParentType, ContextType, RequireFields<MutationDeleteSensorArgs, 'id'>>;
  login?: Resolver<ResolversTypes['LoginResponse'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'password' | 'username'>>;
  updateSensor?: Resolver<ResolversTypes['Sensor'], ParentType, ContextType, RequireFields<MutationUpdateSensorArgs, 'id' | 'locationId' | 'name' | 'type' | 'unit'>>;
};

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  anomalies?: Resolver<Array<ResolversTypes['Anomaly']>, ParentType, ContextType, RequireFields<QueryAnomaliesArgs, 'limit' | 'sensorId' | 'threshold'>>;
  readings?: Resolver<Array<ResolversTypes['Reading']>, ParentType, ContextType, RequireFields<QueryReadingsArgs, 'limit' | 'sensorId'>>;
  sensor?: Resolver<Maybe<ResolversTypes['Sensor']>, ParentType, ContextType, RequireFields<QuerySensorArgs, 'id'>>;
  sensors?: Resolver<Array<ResolversTypes['Sensor']>, ParentType, ContextType>;
};

export type ReadingResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Reading'] = ResolversParentTypes['Reading']> = {
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  recordedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sensorId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  value?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type SensorResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Sensor'] = ResolversParentTypes['Sensor']> = {
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  location?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  locationId?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  unit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = Context> = {
  Anomaly?: AnomalyResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  LoginResponse?: LoginResponseResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Reading?: ReadingResolvers<ContextType>;
  Sensor?: SensorResolvers<ContextType>;
};

