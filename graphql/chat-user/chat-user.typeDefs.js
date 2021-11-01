const { gql } = require('apollo-server')

module.exports = gql`

type Query {
    getChatUserById: ChatUser
}

type Mutation {
    createChatUser(email: String!, name: String!, userName: String!): String!
}

type ChatUser {
    email: String!
}

`;