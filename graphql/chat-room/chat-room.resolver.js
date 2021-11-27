const RocketChatClient = require("../client/rocketchat-client")
const client = new RocketChatClient()

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
        async getJoinedRoomListByUserId(parent, args, context, info) {

            console.log(`query | getJoinedRoomListByUserId: args=${args}`)
            return await getJoinedRoomList(args._id)
        },

    },

    Mutation: {

        async leaveRoom(parent, args, context, info) {

            console.log(`mutation | createChatUser: args=${JSON.stringify(args)}`)
            return await leaveRoom(args.userId, args.roomId)
        }
    },
};

async function getJoinedRoomList(_id) {

    let userHeader = await client.generateUserHeader(_id)

    let result = await client.get('/api/v1/rooms.get', userHeader)
    if (!result.success) {
        console.log(`chat-room-resolver | getJoinedRoomList: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return result.update
        .map(room => convertChatRoom(room))
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
        { roomId: roomId }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | leaveRoom: failed, result=${JSON.stringify(result)}`)
        return false
    }

    return true
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
        ownerUserId: rocketChatRoom.u ? rocketChatRoom.u.username : ""
    }
}

function convertRoomType(roomType) {
    return roomTypeMap[roomType]
}