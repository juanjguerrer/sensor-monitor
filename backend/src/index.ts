import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { formatError } from './graphql/errorHandling';
const server = new ApolloServer({ typeDefs, resolvers, formatError });

startStandaloneServer(server, { listen: { port: 4000 } }).then(({ url }) => {
  console.log(`Servidor listo en ${url}`);
});