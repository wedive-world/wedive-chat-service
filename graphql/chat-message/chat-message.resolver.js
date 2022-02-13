const { PubSub } = require('graphql-subscriptions')

const RocketChatClient = require("../client/rocketchat-client")
const rocketChatClient = new RocketChatClient()

const FirebaseClient = require('../client/fireabse-client')
const firebaseClient = new FirebaseClient()

const ApiClient = require('../client/api-client')
const apiClient = new ApiClient()

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
                .reverse()
        },
        async getChannelHistories(parent, args, context, info) {

            var date = new Date();
            date.setDate(date.getDate() - 30);

            console.log(`query | getChannelHistories: args=${JSON.stringify(args)}, context=${JSON.stringify(context)}, date=${date.toISOString()}`)

            let messages = await getChannelHistories(context.uid, args.roomId, args.skip, args.limit)
            if (!messages) {
                return null
            }

            return messages.reverse()
        },
    },

    Mutation: {

        async postMessageToRoom(parent, args, context, info) {

            console.log(`mutation | postMessageToRoom: args=${JSON.stringify(args)}`)
            return await postMessage(context.uid, args.roomId, args.input)
        },

        async postMessageToUser(parent, args, context, info) {

            console.log(`mutation | postMessageToUser: args=${JSON.stringify(args)}`)
            return await postDirectMessage(context.uid, args.userId, args.input)
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

                let roomIds = args.roomIds

                const pubsub = new PubSub();

                await rocketChatClient.subscribeChatRoomMessage(
                    context.uid,
                    roomIds,
                    context.sessionId,
                    (messages) => {
                        messages
                            .map(message => convertChatMessage(message))
                            .map(message => {
                                message.createdAt = new Date(message.createdAt.$date)
                                return message
                            })
                            .forEach(message => {
                                pubsub.publish(message.chatRoom, {
                                    subscribeRoomMessage: message
                                })
                            })
                    }
                )

                return pubsub.asyncIterator(roomIds)
            }
        },
    },
};

async function postDirectMessage(senderUserId, targetUserId, text, /* attachment */) {

    let userHeader = await rocketChatClient.generateUserHeader(senderUserId)

    let result = await rocketChatClient.post(
        '/api/v1/chat.postMessage',
        userHeader,
        {
            roomId: `@${targetUserId}`,
            text: text
        }
    )

    if (!result.success) {
        console.log(`chat-message-resolver | postMessage: failed, result=${JSON.stringify(result)}`)
        return null
    }

    console.log(`chat-message-resolver | result=${JSON.stringify(result)}`)

    let chatMessage = convertChatMessage(result.message)
    chatMessage.authorName = result.message.u.name
    chatMessage.avatar = await apiClient.getUserProfileImage(senderUserId)
    let tokenList = await apiClient.getFcmTokenList([targetUserId])

    if (tokenList && tokenList.length > 0) {
        await firebaseClient.sendMulticast(tokenList, 'onNewChatMessage', chatMessage)
    }

    return chatMessage
}

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

    let userInfo = await rocketChatClient.get(
        '/api/v1/users.info',
        userHeader,
        {
            username: senderUserId
        }
    )
    // console.log(`chat-message-resolver | userInfo=${JSON.stringify(userInfo.user.name)}`)

    let roomInfo = await rocketChatClient.get(
        '/api/v1/rooms.info',
        userHeader,
        {
            roomId: roomId
        }
    )
    // console.log(`chat-message-resolver | roomInfo=${JSON.stringify(roomInfo.room.usernames)}`)

    let chatMessage = convertChatMessage(result.message)
    chatMessage.authorName = userInfo.user.name
    chatMessage.avatar = await apiClient.getUserProfileImage(serderUserId)

    console.log(`chatMessage=${JSON.stringify(chatMessage)}`)

    let tokenList = await apiClient.getFcmTokenList(
        roomInfo.room.usernames
            .filter(username => username != senderUserId)
    )

    if (tokenList && tokenList.length > 0) {
        await firebaseClient.sendMulticast(tokenList, 'onNewChatMessage', chatMessage)
    }

    return chatMessage
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

    return result.result
        .updated.map(rocketChatMessage => convertChatMessage(rocketChatMessage))
}

async function getChannelHistories(uid, roomId, skip, limit) {

    let result = await rocketChatClient.get(
        '/api/v1/channels.history',
        await rocketChatClient.generateUserHeader(uid),
        {
            roomId: roomId,
            offset: skip,
            count: limit
        }
    )

    if (!result.success) {
        console.log(`chat-message-resolver | getChannelHistories: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return result.messages.map(rocketChatMessage => convertChatMessage(rocketChatMessage))
}

function convertChatMessage(rocketChatMessage) {
    if (!rocketChatMessage) {
        return
    }

    if (rocketChatMessage.t) {
        console.log(`MESSAGE: ${JSON.stringify(rocketChatMessage)}`)
    }

    const isAnnouncement = rocketChatMessage.t

    return {
        _id: rocketChatMessage._id,
        type: isAnnouncement ? convertAnnounceType(rocketChatMessage.t) : 'message',
        author: rocketChatMessage.u.username,
        chatRoom: rocketChatMessage.rid,
        text: rocketChatMessage.msg,
        createdAt: rocketChatMessage.ts,
        updatedAt: rocketChatMessage._updatedAt
    }
}

function convertAnnounceType(rocketChatType) {
    switch (rocketChatType) {
        case 'room_changed_description':
            return 'roomTitleChanged'
        case 'ru':
            return 'userKicked'
        case 'au':
            return 'userInvited'
        case 'ul':
            return 'userLeaved'
        case 'room_desription_changed':
            return ''
    }
}