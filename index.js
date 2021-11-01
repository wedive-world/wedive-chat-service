const express = require('express');
const {
  ApolloServer,
  AuthenticationError,
  ForbiddenError,
} = require('apollo-server-express');

const schema = require('./graphql/schema')

function applyEnvironment() {

  const envList = []

  switch (process.env.NODE_ENV) {
    case 'development':
    case 'production':
      envList.push(require('dotenv').config({ path: './wedive-secret/chat-service-config.env' }).parsed)
      envList.push(require('dotenv').config({ path: './wedive-secret/chat-service-secret.env' }).parsed)
      
      break;

    case 'local':
      envList.push(require('dotenv').config({ path: './wedive-secret/local/chat-service-config.env' }).parsed)
      envList.push(require('dotenv').config({ path: './wedive-secret/local/chat-service-secret.env' }).parsed)
      break;
  }

  console.log(`===========================Environment Variables===============================`)
  envList.forEach(env => {

    Object.keys(env)
      .forEach(key => {
        console.log(`${key}=${env[key]}`)
      })
  })
  console.log(`===============================================================================`)
}

async function startServer() {

  const server = new ApolloServer({
    schema: schema,
    playground: true,
    introspection: true,
    context: ({ req }) => {
      // if (!req.headers.authorization) {
      //   throw new AuthenticationError("mssing token");
      // }

      // const token = req.headers.authorization.substr(7);
      // const user = users.find((user) => user.token === token);

      // if (!user) {
      //   throw new AuthenticationError("invalid token");
      // }

      // console.log(`context | headers: ${JSON.stringify(req.headers)}`)
      // console.log(`context | countryCode: ${JSON.stringify(req.headers.countrycode)}`)
      // console.log(`context | countryCode: ${JSON.stringify(req.headers.authorization)}`)

      return {
        countryCode: req.headers.countrycode,
        user: undefined
      }
    }
  });
  await server.start();

  const app = express();

  server.applyMiddleware({ app });

  await new Promise(r => app.listen({ port: 4000 }, r));
  console.log(`🚀 ${process.env.NODE_ENV} Server ready at http://localhost:4000${server.graphqlPath}`);
}

applyEnvironment();
startServer();