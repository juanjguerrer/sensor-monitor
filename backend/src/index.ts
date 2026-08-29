import 'dotenv/config';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { formatError } from './graphql/errorHandling';
import { Context, createContext } from './graphql/context';
const server = new ApolloServer<Context>({ typeDefs, resolvers, formatError });
startStandaloneServer(server, { listen: { port: 4000 }, context: createContext }).then(({ url }) => {
  console.log(`Servidor listo en ${url}`);
}).catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});