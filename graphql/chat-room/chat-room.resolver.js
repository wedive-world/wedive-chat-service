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
        }
    },

    Query: {
        async getJoinedRoomListByUserId(parent, args, context, info) {

            console.log(`query | getJoinedRoomListByUserId: args=${args}`)
            return await chatRoomService.getJoinedRoomList(args._id)
        },

    },

    // Mutation: {

    //     async createChatUser(parent, args, context, info) {

    //         console.log(`mutation | createChatUser: args=${JSON.stringify(args)}`)
    //         const rocketChatClient = new RocketChatClient()
    //         let result = await rocketChatClient.createUser(args.email, args.name, args.userName)
    //         return JSON.stringify(result)

    //     }
    // },
};