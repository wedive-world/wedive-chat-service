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
            console.log(`chat-room-resolver | chatRoom: parent=${JSON.stringify(parent)}`)
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
        },

        async createRoom(parent, args, context, info) {
            let membersUids = args.membersUids ? args.membersUids : []
            membersUids.push(context.uid)
            return await createRoom(args.name, args.description, membersUids)
        },
        async invite(parent, args, context, info) {
            return await invite(context.uid, args.roomId, args.userId)
        },
        async kick(parent, args, context, info) {
            return await kick(context.uid, args.roomId, args.uid)
        },
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
    // console.log(`chat-room-resolver | getJoinedRoomList: subscriptions=${JSON.stringify(subscriptions)}`)

    let subscriptionMap = new Map()
    subscriptions.update.forEach(subscription => {
        subscriptionMap.set(subscription.rid, subscription)
    });

    return result.update
        .map(room => convertChatRoom(room))
        .map(chatRoom => {
            let subscription = subscriptionMap.get(chatRoom._id)
            chatRoom.unread = subscription.unread
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

async function getChannelInfo(uid, roomId) {

    let userHeader = await client.generateUserHeader(uid)
    let queryParams = {
        roomId: roomId
    }

    let result = await client.get('/api/v1/channels.info', userHeader, queryParams)
    if (!result.success) {
        console.log(`chat-room-resolver | getChatRoom: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertChatRoom(result.channel)
}

async function leaveRoom(userId, roomId) {

    let userHeader = await client.generateUserHeader(userId)

    let result = await client.post(
        '/api/v1/channels.leave',
        userHeader,
        { roomId: roomId }
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
async function createRoom(roomName, description, membersUids) {

    let userHeader = await client.generateUserHeader(uid)

    let result = await client.post(
        '/api/v1/channels.create',
        userHeader,
        {
            name: roomName,
            members: membersUids
        }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | createRoom: failed, result=${JSON.stringify(result)}`)
        return null
    }

    let descriptionResult = await client.post(
        '/api/v1/channels.setDescription',
        userHeader,
        {
            roomId: result.channel._id,
            description: description
        }
    )

    if (!descriptionResult.success) {
        console.log(`chat-room-resolver | setDescription: failed, result=${JSON.stringify(descriptionResult)}`)
    }

    return convertChatRoom(result.channel)
}

async function invite(uid, roomId, userId) {

    let userHeader = await client.generateUserHeader(uid)

    let result = await client.post(
        '/api/v1/channels.invite',
        userHeader,
        {
            roomId: roomId,
            userId: userId
        }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | invite: failed, result=${JSON.stringify(result)}`)
        return {
            success: false
        }
    }

    return {
        success: true
    }
}

async function kick(uid, roomId) {

    let userHeader = await client.generateUserHeader(uid)

    let result = await client.post(
        '/api/v1/channels.leave',
        userHeader,
        { roomId: roomId }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | kick: failed, result=${JSON.stringify(result)}`)
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
        name: rocketChatRoom.description,

        ownerUserId: rocketChatRoom.u ? rocketChatRoom.u.username : "",
        userIds: rocketChatRoom.usernames,
        usersCount: rocketChatRoom.usersCount,

        lastChatMessage: rocketChatRoom.lastMessage,

        createdAt: rocketChatRoom.ts,
    }
}

function convertRoomType(roomType) {
    return roomTypeMap[roomType]
}