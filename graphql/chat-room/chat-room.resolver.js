const chatRoomService = require('../../service/chat-room-service')
const chatUserService = require('../../service/chat-user-service')

module.exports = {
    ChatRoom: {
        async chatUsers(parent, args, context, info) {
            let chatUsers = []
            for (userId of parent.userIds) {
                let chatUser = await chatUserService.getChatUserById(userId)
                chatUsers.push(chatUser)
            }

            return chatUsers
        },
    },

    Query: {
        async getJoinedRoomListByUserId(parent, args, context, info) {

            console.log(`query | getJoinedRoomListByUserId: args=${args}`)
            return await chatRoomService.getJoinedRoomList(args._id)
        },

    },

    Mutation: {

        async leaveRoom(parent, args, context, info) {

            console.log(`mutation | createChatUser: args=${JSON.stringify(args)}`)
            return await chatRoomService.leaveRoom(args.userId, args.roomId)
        }
    },
};