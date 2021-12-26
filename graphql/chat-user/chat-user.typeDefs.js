const { gql } = require('apollo-server')

module.exports = gql`

type Query {
    getChatUserById: ChatUser @cacheControl(maxAge: 30)
}

type Mutation {
    createChatUser(_id: String!, email: String!, name: String!): ChatUser!
    updateChatUser(name: String!, avatarUrl: String): Response!

    createChatUserV2(_id: String!, email: String!, name: String!): ChatUser!
    updateChatUserV2(input: ChatUserInput): Response!
}

# interface IUser {
#     _id: String;
#     createdAt: Date;
#     roles: String[];
#     type: String;
#     active: boolean;
#     username?: String;
#     name?: String;
#     services?: IUserServices;
#     emails?: IUserEmail[];
#     status?: String;
#     statusConnection?: String;
#     lastLogin?: Date;
#     avatarOrigin?: String;
#     utcOffset?: number;
#     language?: String;
#     statusDefault?: String;
#     oauth?: {
#         authorizedClients: String[];
#     };
#     _updatedAt?: Date;
#     statusLivechat?: String;
#     e2e?: {
#         private_key: String;
#         public_key: String;
#     };
#     requirePasswordChange?: boolean;
#     customFields?: {
#         [key: String]: any;
#     };
#     settings?: IUserSettings;
# }
type ChatUser {
    _id: String
    active: Boolean
    name: String
    email: String
    avatarOrigin: String
    utcOffset: Int

    createdAt: Date
    updatedAt: Date
}

input ChatUserInput {
    uid: String
    name: String
    email: String
    avatarOrigin: String
    fcmToken: String

    createdAt: Date
    updatedAt: Date
}

type ChatRoom {
    chatUsers: [ChatUser]
    owner: ChatUser
}

type ChatMessage {
    author: ChatUser
}
`;