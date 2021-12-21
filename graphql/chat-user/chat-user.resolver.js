const RocketChatClient = require("../client/rocketchat-client")
const client = new RocketChatClient()

module.exports = {
    ChatRoom: {
        async chatUsers(parent, args, context, info) {
            console.log(`chat-user-resolver: parent=${JSON.stringify(parent)}`)

            let chatUsers = []
            for (userId of parent.userIds) {
                let chatUser = await getChatUserById(userId)
                chatUsers.push(chatUser)
            }

            return chatUsers
        },

        async owner(parent, args, context, info) {
            console.log(`chat-user-resolver: parent=${JSON.stringify(parent)}`)
        },
    },

    ChatMessage: {
        async author(parent, args, context, info) {
            return await getChatUserById(parent.author)
        },
    },

    Query: {
        async getChatUserById(parent, args, context, info) {

            console.log(`query | getChatUserById: context=${JSON.stringify(context)}`)
            return await getChatUserById(context.uid)
        },

    },

    Mutation: {

        async createChatUser(parent, args, context, info) {

            console.log(`mutation | createChatUser: args=${JSON.stringify(args)}`)
            let user = await createUser(args._id, args.email, args.name)
            return user
        }
    },
};


async function getChatUserById(_id) {

    let queryParams = {
        username: _id
    }

    let result = await client.get('/api/v1/users.info', client.getAixosAdminHeader(), queryParams)
    if (!result.success || !result.user) {
        console.log(`chat-user-service | getChatUserById: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertUser(result.user)
}

async function createUser(_id, email, name) {

    const hashPassword = client.generatePassword(_id)

    const postData = {
        username: _id,
        email: email,
        name: name,
        password: hashPassword,
        joinDefaultChannels: false,
    }

    let result = await client.post('/api/v1/users.create', client.getAixosAdminHeader(), postData)
    if (!result.success || !result.user) {
        console.log(`chat-user-service | createUser: failed, result=${JSON.stringify(result)}`)
        return null
    }

    console.log(`createUser: result=${JSON.stringify(result)}`)

    return convertUser(result.user)
}

function convertUser(rocketChatUser) {
    // console.log(`convertUser: rocketChatUser=${JSON.stringify(rocketChatUser)}`)

    return {
        _id: rocketChatUser.username,
        name: rocketChatUser.name,
        type: rocketChatUser.type,
        active: rocketChatUser.active,
        email: rocketChatUser.emails.pop().address,

        avatarOrigin: rocketChatUser.avatarOrigin,
        utcOffset: rocketChatUser.utcOffset,

        createdAt: rocketChatUser.createdAt,
        updatedAt: rocketChatUser._updatedAt
    }
}