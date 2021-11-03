const RocketChatClient = require("./client/rocketchat-client")

module.exports.getChatUserById = async (_id) => {

    let client = new RocketChatClient()
    let queryParams = {
        username: _id
    }

    let result = await client.get('/api/v1/users.info', client.adminHeader, queryParams)
    if (!result.success || !result.user) {
        console.log(`chat-user-service | getChatUserById: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertUser(result.user)
}

module.exports.createUser = async (_id, email, name) => {

    let client = new RocketChatClient()
    const hashPassword = client.generatePassword(email)

    const postData = {
        email: email,
        name: name,
        password: hashPassword,
        username: _id,
        joinDefaultChannels: false,
    }

    let result = await client.post('/api/v1/users.create', client.adminHeader, postData)
    if (!result.success || !result.user) {
        console.log(`chat-user-service | createUser: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertUser(result.user)
}

function convertUser(rocketChatUser) {
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
