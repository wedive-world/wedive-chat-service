const { PubSub } = require('graphql-subscriptions')

const RocketChatClient = require("../client/rocketchat-client")
const rocketChatClient = new RocketChatClient()

const FirebaseClient = require('../client/fireabse-client')
const firebaseClient = new FirebaseClient()

module.exports = {

    ChatRoom: {
        async lastChatMessage(parent, args, context, info) {
            console.log(`lastChatMessage: parent=${JSON.stringify(parent)}`)
            return convertChatMessage(parent.lastChatMessage)
        },
    },

    Query: {
        async getMessagesByRoomIdSinceUpdated(parent, args, context, info) {
            console.log(`query | getMessagesByRoomIdSinceUpdated: args=${JSON.stringify(args)}`)

            return await syncMessage(context.uid, args.roomId, args.updagedSince)
        },

        async getMessagesByRoomId(parent, args, context, info) {

            var date = new Date();
            date.setDate(date.getDate() - 30);

            console.log(`query | getMessagesByRoomId: args=${JSON.stringify(args)}, context=${JSON.stringify(context)}, date=${date.toISOString()}`)

            let messages = await syncMessage(context.uid, args.roomId, date.toISOString())
            if (!messages) {
                return null
            }

            return messages.slice(args.skip, args.skip + args.limit)
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

    Subscription: {
        subscribeRoomMessage: {
            subscribe: async (parent, args, context, info) => {

                console.log(`subscription | subscribeRoomMessage: args=${JSON.stringify(args)}`)
                console.log(`subscription | subscribeRoomMessage: context=${JSON.stringify(context)}`)

                let roomId = args.roomId

                const pubsub = new PubSub();

                await rocketChatClient.subscribeChatRoomMessage(
                    context.uid,
                    roomId,
                    context.sessionId,
                    (messages) => {
                        let chatMessages = messages.map(message => convertChatMessage(message))
                        pubsub.publish(roomId, {
                            subscribeRoomMessage: chatMessages
                        })
                    }
                )

                return pubsub.asyncIterator([roomId])
            }
        },
    },
};

async function postMessage(senderUserId, roomId, text, /* attachment */) {

    let userHeader = await rocketChatClient.generateUserHeader(senderUserId)

    let result = await rocketChatClient.post(
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

    let roomInfo = await rocketChatClient.get(
        '/api/v1/rooms.info',
        userHeader,
        {
            roomId: roomId
        }
    )
    console.log(`chat-message-resolver | roomInfo=${JSON.stringify(roomInfo.room.usernames)}`)

    for (username of roomInfo.room.usernames) {
        let userInfo = await rocketChatClient.get(
            '/api/v1/users.info',
            userHeader,
            {
                username: username
            }
        )

        console.log(`chat-message-resolver | userInfo=${JSON.stringify(userInfo)}`)
    }
    // firebaseClient.sendMulticast()

    return convertChatMessage(result.message)
}

/* upadtedSince type: 2019-04-16T18:30:46.669Z */
async function syncMessage(uid, roomId, updatedSince) {

    console.log(`chat-message-resolver | syncMessage: uid=${uid}, roomId=${roomId}, updatedSince=${updatedSince}`)

    let date = new Date()
    date.setDate(date.getDate() - 1)

    let queryParams = {
        roomId: roomId,
        lastUpdate: updatedSince ? updatedSince : date.toString()
    }

    let userHeader = await rocketChatClient.generateUserHeader(uid)

    let result = await rocketChatClient.get('/api/v1/chat.syncMessages', userHeader, queryParams)
    if (!result.success) {
        console.log(`chat-message-resolver | syncMessage: failed, result=${JSON.stringify(result)}`)
        return null
    }

    // console.log(`chat!!! ${JSON.stringify(result.result.updated)}`)

    return result.result.updated.map(rocketChatMessage => convertChatMessage(rocketChatMessage))
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