const express = require('express');

const {
  ApolloServer,
  AuthenticationError,
  ForbiddenError,
} = require('apollo-server-express');
const { ApolloServerPluginCacheControl } = require('apollo-server-core')

const { execute, subscribe } = require('graphql')

const { createServer } = require('http')
const { SubscriptionServer } = require('subscriptions-transport-ws')

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');


const schema = require('./graphql/schema');
const { randomUUID } = require('crypto');
const RocketChatClient = require('./graphql/client/rocketchat-client')

require('dotenv').config({ path: process.env.PWD + '/wedive-secret/firebase-admin/firebase-admin.env' })

const firebaseApp = initializeApp()
const firebaseAuth = getAuth(firebaseApp)

applyEnvironment();
startServer();

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

  const app = express();
  app.use('/healthcheck', require('express-healthcheck')())

  const httpServer = createServer(app);

  const subscriptionServer = SubscriptionServer.create(
    {
      schema, execute, subscribe,
      async onConnect(connectionParams, webSocket, context) {
        // console.log(`Connected! connectionParams=${JSON.stringify(connectionParams)}`)
        let uid = await validateIdToken(connectionParams);
        let sessionId = randomUUID()

        webSocket.sessionId = sessionId;

        return {
          uid: uid ? uid : 'RuOiMt9YUTbRUJQTrXv4cWMEimr2',
          idToken: connectionParams.idtoken,
          sessionId: sessionId
        }
      },
      onOperationComplete(webSocket) {
        console.log(`onOperationComplete! webSocket=${JSON.stringify(webSocket.sessionId)}`)
        let rocketChatClient = new RocketChatClient()
        rocketChatClient.expireSession(webSocket.sessionId)
      },
      onDisconnect(webSocket, context) {
        console.log(`Disconnected! webSocket=${JSON.stringify(webSocket)}`)
        let rocketChatClient = new RocketChatClient()
        rocketChatClient.expireSession(webSocket.sessionId)
      },
    },
    { server: httpServer, path: '/graphql' }
  );

  const server = new ApolloServer({
    schema: schema,
    playground: true,
    introspection: true,

    context: async ({ req }) => {
      if (!req.headers.idtoken) {
        throw new AuthenticationError("mssing idtoken");
      }

      let uid = await validateIdToken(req.headers);

      return {
        uid: uid,
        idToken: req.headers.idtoken
      }
    },

    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            }
          }
        }
      },
      ApolloServerPluginCacheControl({ defaultMaxAge: 5 }),  //60 seconds
    ],
  });

  await server.start();
  server.applyMiddleware({ app });

  httpServer.listen(
    { port: 4000 },
    () => console.log(`🚀 ${process.env.NODE_ENV} Server ready at http://localhost:4000${server.graphqlPath}`)
  )
}

async function validateIdToken(header) {
  if (!header) {
    return null
  }

  let uid = null;

  if (header.idtoken) {
    console.log(`index | context: header.idtoken=${header.idtoken}`);
    try {
      let decodedToken = await firebaseAuth.verifyIdToken(header.idtoken);
      uid = decodedToken.uid;
      console.log(`index | context: decode success, uid=${uid}`);

    } catch (err) {
      console.log(`err!! + ${err}`);
      throw new AuthenticationError(err);
    }
  }
  return uid;
}
