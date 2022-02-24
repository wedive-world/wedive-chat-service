const { gql } = require('apollo-server')

module.exports = gql`

type Query {
    getMessagesByRoomIdSinceUpdated(roomId: String!, updatedSince: Date): [ChatMessage]
    getMessagesByRoomId(roomId: String!, skip: Int = 0, limit: Int = 30): [ChatMessage]
    getChannelHistories(roomId: String!, skip: Int = 0, limit: Int = 30): [ChatMessage]
}

type Mutation {
    postMessageToUser(userId: String!, input: String!): ChatMessage
    postMessageToRoom(roomId: String!, input: String!): ChatMessage
    postMessageToChannel(channel: String!, input: String!): ChatMessage
}

type Subscription {
    subscribeRoomMessage(roomIds: [String]!): ChatMessage
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
type ChatMessage {
    _id: String
    text: String
    author: ChatUser
    type: ChatMessageType
    attachments: [Attachment]
    createdAt: Date
    updatedAt: Date
}

subscription ChatMessage {
    _id: String
    text: String
    author: ChatUser
    hasAttachments: boolean
    createdAt: Date
    updatedAt: Date
}

enum ChatMessageType {
    message
    roomTitleChanged
    userJoined
    userInvited
    userLeaved
    userKicked
}

input ChatMessageInput {
    text: String
    attachments: [AttachmentInput]
}

type Attachment {
    _id: String
    attachmentText: String
    imageUrl: String
    audioUrl: String
    videoUrl: String
}

input AttachmentInput {
    attachmentText: String
    imageUrl: String
    audioUrl: String
    videoUrl: String
}

type ChatRoom {
    lastChatMessage: ChatMessage
}

type ChatRoomInfo {
    chatMessages: [ChatMessage]
}
`;