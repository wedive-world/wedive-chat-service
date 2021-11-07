const { gql } = require('apollo-server')

module.exports = gql`

type Query {
    getChatUserById(_id: String!): ChatUser
}

type Mutation {
    createChatUser(_id: String!, email: String!, name: String!): ChatUser!
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

type ChatRoom {
    chatUsers: [ChatUser]
    owener: ChatUser
}

type ChatMessage {
    author: ChatUser
}
`;