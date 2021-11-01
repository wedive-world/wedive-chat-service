const RocketChatClient = require('../../rocketchat/rocketchat-client')

module.exports = {

    Query: {
        async getChatUserById(parent, args, context, info) {

            console.log(`query | getChatUserById: args=${args}`)

            return null
        },

    },

    Mutation: {

        async createChatUser(parent, args, context, info) {

            console.log(`mutation | createChatUser: args=${JSON.stringify(args)}`)
            const rocketChatClient = new RocketChatClient()
            let result = await rocketChatClient.createUser(args.email, args.name, args.userName)
            return result

        }
    },
};