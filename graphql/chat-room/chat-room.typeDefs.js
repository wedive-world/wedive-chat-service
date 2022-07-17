const { gql } = require('apollo-server')

module.exports = gql`

type Query {
    getJoinedRoomList: [ChatRoom]
    getChatRoomInfo(roomId: String!, skip: Int = 0, limit: Int = 30): ChatRoomInfo
}

type Mutation {
    markRead(roomId: String!): Response!
    leaveRoom(roomId: String!): Response!
    leaveChannel(channelId: String!): Response!
    deleteRoom(roomId: String!): Response!
    createRoom(title: String!, membersUids: [String]): ChatRoom
    setRoomTitle(roomId:String!, title: String!): Response!
    invite(roomId: String!, userId: String!): Response!
    kick(roomId: String!, userId: String!): Response!
}

# {
#   "_id": "22nytdn4QqKvSk2Av",              // Random.id()
#   "t": "p",                                // String           Room Type: c = chanel, d = direct, p (change to g) = group, v = visitor
#   "ts": new Date(1432937851208),           // Date             Room Creation Timestamp
#   "name": "general",                       // String           Room Name (t:d -> empty)
#   "lm": new Date(1432937851208),           // Date             Last Message Timestamp
#   "msgs": 2345,                            // Integer          Messages Counter
#   "cl": true,                              // Boolean          If users can leave room
#   "ro": false,                             // Boolean          Read Only
#   "usernames": [                           // Array(String)    Room Users
#       "username1",                         // String           User Username
#       "username2",
#       "username3"
#   ],
#   "u": {                                   // Object           Owner User
#     "_id": "CABrXSHpDqbZXGkYR",            // Random.id()      User Id
#     "username": "john"                     // String           User Username
#   },
#   "customFields": {                        // Object           User defined custom fields (for t:c and t:p only)
#      "userDefinedField": "userValue",      //                  User defined field example
#      "userDefinedField2": true,            //                  User defined field example
#      "userObject3": {                      //                  User defined field example
#         "a": "hello",
#         "b": "lalala"
#      }
#   }
# }
type ChatRoom {
    _id: String
    title: String
    type: ChatRoomType

    lastMessageAt: String
    numOfmessages: Int
    unread: Int

    divingInfo: DivingInfo

    createdAt: Date
}

type DivingInfo {
    _id: ID
    title: String
    name: String
    daysLeft: Int
}

type ChatRoomInfo {
    roomId: ID
    skip: Int
    limit: Int
    chatRoom: ChatRoom
}

enum ChatRoomType {
    channel
    direct
    group
    visitor
}

type ChatMessage {
    chatRoom: ChatRoom
}

`;