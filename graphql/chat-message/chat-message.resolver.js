const RocketChatClient = require("../client/rocketchat-client")
const client = new RocketChatClient()

module.exports = {

    Query: {
        async getMessagesByRoomIdSinceUpdated(parent, args, context, info) {
            console.log(`query | getMessagesByRoomIdSinceUpdated: args=${JSON.stringify(args)}`)

            return await syncMessage(context.userId, args.roomId, args.updagedSince)
        },
    },

    Mutation: {

        async postMessageToRoom(parent, args, context, info) {

            console.log(`mutation | postMessageToRoom: args=${JSON.stringify(args)}`)
            return await postMessage(context.uid, args.roomId, args.input)
        },

        async postMessageToUser(parent, args, context, info) {

            console.log(`mutation | postMessageToUser: args=${JSON.stringify(args)}`)
            return await postMessage(context.uid, `@${args.userId}`, args.input)
        },

        async postMessageToChannel(parent, args, context, info) {

            console.log(`mutation | postMessageToChannel: args=${JSON.stringify(args)}`)
            return await postMessage(context.uid, `#${args.channelId}`, args.input)
        },
    },
};

async function postMessage(senderUserId, roomId, text, /* attachment */) {

    let userHeader = await client.generateUserHeader(senderUserId)

    let result = await client.post(
        '/api/v1/chat.postMessage',
        userHeader,
        {
            roomId: roomId,
            text: text
        }
    )

    if (!result.success) {
        console.log(`chat-message-resolver | postMessage: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertChatMessage(result.message)
}

/* upadtedSince type: 2019-04-16T18:30:46.669Z */
async function syncMessage(userId, roomId, updatedSince) {

    let queryParams = {
        roomId: roomId,
        updatedSince: updatedSince
    }

    let userHeader = client.generateUserHeader(userId)

    let result = await client.get('/api/v1/chat.syncMessages', userHeader, queryParams)
    if (!result.success || !result.user) {
        console.log(`chat-message-resolver | syncMessage: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return result.updated.map(rocketChatMessage => convertChatMessage(rocketChatMessage))
}

function convertChatMessage(rocketChatMessage) {
    return {
        _id: rocketChatMessage._id,
        author: rocketChatMessage.u.username,
        chatRoom: rocketChatMessage.rid,
        text: rocketChatMessage.msg,
        createdAt: rocketChatMessage.ts,
        updatedAt: rocketChatMessage._updatedAt
    }
}