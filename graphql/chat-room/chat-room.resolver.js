const RocketChatClient = require("../client/rocketchat-client")
const client = new RocketChatClient()

const { PubSub } = require("apollo-server");

const roomTypeMap = {
    c: 'channel',
    d: 'direct',
    g: 'group',
    v: 'visitor'
}

module.exports = {
    ChatMessage: {
        async chatRoom(parent, args, context, info) {
            console.log(`chat-room-resolver: parent=${JSON.stringify(parent)}`)
            return await getChatRoom(context.uid, parent.chatRoom)
        }
    },

    Query: {
        async getJoinedRoomList(parent, args, context, info) {
            console.log(`query | getJoinedRoomList: context=${JSON.stringify(context)}`)
            return await getJoinedRoomList(context.uid)
        },

    },

    Mutation: {

        async leaveRoom(parent, args, context, info) {
            console.log(`mutation | leaveRoom: args=${JSON.stringify(args)}`)
            console.log(`mutation | leaveRoom: context=${JSON.stringify(context)}`)
            return await leaveRoom(context.uid, args.roomId)
        },

        async markRead(parent, args, context, info) {
            console.log(`mutation | markRead: args=${JSON.stringify(args)}`)
            console.log(`mutation | markRead: context=${JSON.stringify(context)}`)
            return await markRead(context.uid, args.roomId)
        }
    },
};

async function getJoinedRoomList(uid) {

    let userHeader = await client.generateUserHeader(uid)

    let result = await client.get('/api/v1/rooms.get', userHeader)
    if (!result.success) {
        console.log(`chat-room-resolver | getJoinedRoomList: failed, result=${JSON.stringify(result)}`)
        return null
    }
    console.log(`chat-room-resolver | getJoinedRoomList: result=${JSON.stringify(result)}`)

    let subscriptions = await client.get('/api/v1/subscriptions.get', userHeader)
    console.log(`chat-room-resolver | getJoinedRoomList: subscriptions=${JSON.stringify(subscriptions)}`)

    let subscriptionMap = new Map()
    subscriptions.update.forEach(subscription => {
        subscriptionMap.set(subscription.rid, subscription)
    });

    return result.update
        .map(room => convertChatRoom(room))
        .map(chatRoom => {
            let subscription = subscriptionMap.get(chatRoom._id)
            chatRoom.unread = subscription.unread
            chatRoom.name = subscription.name
            return chatRoom
        })
}

async function getChatRoom(uid, roomId) {

    let userHeader = await client.generateUserHeader(uid)
    let queryParams = {
        roomId: roomId
    }

    let result = await client.get('/api/v1/rooms.info', userHeader, queryParams)
    if (!result.success) {
        console.log(`chat-room-resolver | getChatRoom: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertChatRoom(result.room)
}

async function leaveRoom(userId, roomId) {

    let userHeader = await client.generateUserHeader(userId)

    let result = await client.post(
        '/api/v1/rooms.leave',
        userHeader,
        { rid: roomId }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | leaveRoom: failed, result=${JSON.stringify(result)}`)
        return {
            success: false
        }
    }

    return {
        success: true
    }
}

async function markRead(uid, roomId) {

    let userHeader = await client.generateUserHeader(uid)

    let result = await client.post(
        '/api/v1/subscriptions.read',
        userHeader,
        { rid: roomId }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | markRead: failed, result=${JSON.stringify(result)}`)
        return {
            success: false
        }
    }

    return {
        success: true
    }
}

function convertChatRoom(rocketChatRoom) {
    return {
        _id: rocketChatRoom._id,
        type: convertRoomType(rocketChatRoom.t),
        createdAt: rocketChatRoom.ts,
        name: rocketChatRoom.name,
        canLeave: rocketChatRoom.cl,
        readOnly: rocketChatRoom.ro,
        userIds: rocketChatRoom.usernames,
        ownerUserId: rocketChatRoom.u ? rocketChatRoom.u.username : "",
        lastChatMessage: rocketChatRoom.lastMessage
    }
}

function convertRoomType(roomType) {
    return roomTypeMap[roomType]
}