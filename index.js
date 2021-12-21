const express = require('express');
const {
  ApolloServer,
  AuthenticationError,
  ForbiddenError,
} = require('apollo-server-express');

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const schema = require('./graphql/schema')

require('dotenv').config({ path: process.env.PWD + '/wedive-secret/firebase-admin/firebase-admin.env' })

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

  const firebaseApp = initializeApp()
  const firebaseAuth = getAuth(firebaseApp)

  const server = new ApolloServer({
    schema: schema,
    playground: true,
    introspection: true,
    context: async ({ req }) => {
      // if (!req.headers.authorization) {
      //   throw new AuthenticationError("mssing token");
      // }

      let uid = null

      if (req.headers.idtoken) {
        try {
          let decodedToken = await firebaseAuth.verifyIdToken(req.headers.idtoken)
          uid = decodedToken.uid;
          console.log(`uid=${uid}`)
        } catch (err) {
          console.log(`err!! + ${err}`)
        }
      }

      return {
        uid: uid ? uid : 'a4H7anucnXWGBV4QR7FEf7iZYXv2',
        idToken: req.headers.idtoken,
        user: undefined
      }
    }
  });
  await server.start();

  const app = express();

  app.use('/healthcheck', require('express-healthcheck')())

  server.applyMiddleware({ app });

  await new Promise(r => app.listen({ port: 4000 }, r));
  console.log(`🚀 ${process.env.NODE_ENV} Server ready at http://localhost:4000${server.graphqlPath}`);
}

applyEnvironment();
startServer();