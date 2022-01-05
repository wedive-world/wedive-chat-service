const RocketChatClient = require("../client/rocketchat-client")
const client = new RocketChatClient()

module.exports = {
    ChatRoom: {
        async chatUsers(parent, args, context, info) {

            let chatUsers = []
            if (parent.userIds && parent.userIds.length > 0) {
                for (userId of parent.userIds) {
                    let chatUser = await getChatUserById(userId)
                    chatUsers.push(chatUser)
                }
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
        },

        async updateChatUser(parent, args, context, info) {

            console.log(`mutation | updateChatUser: args=${JSON.stringify(args)}`)
            let user = await updateUser(context.uid, args.name, args.avatarUrl)
            return user
        },

        async updateFcmToken(parent, args, context, info) {

            console.log(`mutation | updateFcmToken: args=${JSON.stringify(args)}`)
            let user = await updateFcmToken(args._id, args.fcmToken)
            return user
        },
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

async function getChannelMemberList(uid, roomId) {

    let result = await client.get(
        '/api/v1/channels.members',
        await client.generateUserHeader(uid),
        {
            roomId: roomId
        }
    )

    if (!result.success) {
        console.log(`chat-user-service | getChannelMemberList: failed, result=${JSON.stringify(result)}`)
        return null
    }

    let userList = result.members.map(user => convertUser(user))
    console.log(`chat-user-resolver | getChannelMemberList: userList=${JSON.stringify(userList)}`)
    return userList
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

async function updateUser(uid, name, avatarUrl) {

    let avatarData = {
        userId: uid,
        avatarUrl: avatarUrl
    }

    let avatarResult = await client.post('/api/v1/users.setAvatar', client._getUserToken(uid), avatarData)
    if (!avatarResult.success) {
        console.log(`chat-user-service | updateUser: failed, avatarResult=${JSON.stringify(avatarResult)}`)
    }

    let userData = {
        userId: uid,
        data: {
            name: name
        }
    }

    let userResult = await client.post('/api/v1/users.update', client._getUserToken(uid), userData)
    if (!userResult.success) {
        console.log(`chat-user-service | updateUser: failed, userResult=${JSON.stringify(userResult)}`)
    }

    console.log(`updateUser: avatarResult=${JSON.stringify(avatarResult)}`)
    console.log(`updateUser: userResult=${JSON.stringify(userResult)}`)

    return {
        success: avatarResult.success && userResult.success
    }
}

async function updateFcmToken(uid, fcmToken) {

    let userData = {
        userId: uid,
        data: {
            customFields: {
                fcmToken: fcmToken
            }
        }
    }

    let result = await client.post('/api/v1/users.update', client._getUserToken(uid), userData)
    if (!result.success) {
        console.log(`chat-user-service | updateFcmToken: failed, userResult=${JSON.stringify(result)}`)
    }

    console.log(`updateFcmToken: userResult=${JSON.stringify(result)}`)

    return {
        success: result.success
    }
}

function convertUser(rocketChatUser) {
    // console.log(`convertUser: rocketChatUser=${JSON.stringify(rocketChatUser)}`)

    return {
        _id: rocketChatUser.username,
        name: rocketChatUser.name,

        avatarOrigin: rocketChatUser.avatarOrigin,

        createdAt: rocketChatUser.createdAt,
        updatedAt: rocketChatUser._updatedAt
    }
}