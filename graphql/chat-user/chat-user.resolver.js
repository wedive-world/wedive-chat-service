const chatUserService = require('../../service/chat-user-service')

module.exports = {

    Query: {
        async getChatUserById(parent, args, context, info) {

            console.log(`query | getChatUserById: args=${args}`)
            let user = await chatUserService.getChatUserById(args._id)
            return user
        },

    },

    Mutation: {

        async createChatUser(parent, args, context, info) {

            console.log(`mutation | createChatUser: args=${JSON.stringify(args)}`)
            let user = await chatUserService.createUser(args._id, args.email, args.name)
            return user
        }
    },
};