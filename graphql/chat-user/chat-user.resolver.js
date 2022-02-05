const RocketChatClient = require("../client/rocketchat-client")
const client = new RocketChatClient()

const ApiClient = require("../client/api-client")
const apiClient = new ApiClient()

module.exports = {
    ChatRoom: {
        async chatUsers(parent, args, context, info) {

            let chatUsers = []
            if (parent.userIds && parent.userIds.length > 0) {
                for (userId of parent.userIds) {
                    let chatUser = await getChatUserByUserId(userId)
                    chatUsers.push(chatUser)
                }
            }

            return chatUsers
        },

        async owner(parent, args, context, info) {
            return await getChatUserByUserId(parent.ownerUserId)
        },
    },

    ChatMessage: {
        async author(parent, args, context, info) {
            return await getChatUserByUserName(parent.author)
        },
    },

    ChatUser: {
        async avatarOrigin(parent, args, context, info) {
            return await apiClient.getUserProfileImage(parent.uid)
        },
    },

    Query: {
        async getChatUserByUsername(parent, args, context, info) {

            console.log(`query | getChatUserByUsername: context=${JSON.stringify(context)}`)
            return await getChatUserByUserName(args.username)
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
            let chatUser = await updateUser(context.uid, args.name, args.avatarUrl)
            return chatUser
        },

        async updateFcmToken(parent, args, context, info) {

            console.log(`mutation | updateFcmToken: args=${JSON.stringify(args)}`)
            let user = await updateFcmToken(args._id, args.fcmToken)
            return user
        },
    },
};

async function getChatUserByUserName(userName) {

    let queryParams = {
        username: userName
    }

    let result = await client.get('/api/v1/users.info', client.getAixosAdminHeader(), queryParams)
    if (!result.success || !result.user) {
        console.log(`chat-user-service | getChatUserById: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertUser(result.user)
}

async function getChatUserByUserId(userId) {

    let queryParams = {
        userId: userId
    }

    let result = await client.get('/api/v1/users.info', client.getAixosAdminHeader(), queryParams)
    if (!result.success || !result.user) {
        console.log(`chat-user-service | getChatUserById: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertUser(result.user)
}

async function getAvatarByUserName(username) {

    let queryParams = {
        username: username
    }

    let result = await client.get('/api/v1/users.getAvatar', client.getAixosAdminHeader(), queryParams)
    if (!result) {
        console.log(`chat-user-service | getAvatarByUserId: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return result
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

async function createUser(uid, email, name) {

    const hashPassword = client.generatePassword(uid)

    const postData = {
        username: uid,
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
    console.log(`chat-user-service | updateUser: uid=${uid}, name=${name}, avatarUrl=${avatarUrl}}`)

    let success = true
    let reason = ''

    if (avatarUrl) {

        let avatarData = {
            avatarUrl: avatarUrl
        }

        let avatarResult = await client.post('/api/v1/users.setAvatar', await client.generateUserHeader(uid), avatarData)
        if (!avatarResult.success) {
            console.log(`chat-user-service | updateUser: failed, avatarResult=${JSON.stringify(avatarResult)}`)
            reason += avatarResult
            success = false
        }
    }

    if (name) {
        let userData = {
            data: {
                name: name
            }
        }

        let userResult = await client.post('/api/v1/users.updateOwnBasicInfo', await client.generateUserHeader(uid), userData)
        if (!userResult.success) {
            console.log(`chat-user-service | updateUser: failed, userResult=${JSON.stringify(userResult)}`)
            reason += userResult
            success = false
        }
    }

    return {
        success: true,
        reason: reason
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
        _id: rocketChatUser._id,
        uid: rocketChatUser.username,
        name: rocketChatUser.name,

        avatarOrigin: rocketChatUser.avatarOrigin,

        createdAt: rocketChatUser.createdAt,
        updatedAt: rocketChatUser._updatedAt
    }
}