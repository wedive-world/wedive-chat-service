const RocketChatClient = require("./client/rocketchat-client")

const roomTypeMap = {
    c: 'channel',
    d: 'direct',
    g: 'group',
    v: 'visitor'
}

module.exports.getJoinedRoomList = async (_id) => {

    let client = new RocketChatClient()
    let userHeader = await client.generateUserHeader(_id)

    let result = await client.get('/api/v1/rooms.get', userHeader)
    if (!result.success) {
        console.log(`chat-room-service | getJoinedRoomList: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return result.update
        .map(room => convertChatRoom(room))
}

module.exports.leaveRoom = async (userId, roomId) => {

    let client = new RocketChatClient()
    let userHeader = await client.generateUserHeader(userId)

    let result = await client.post(
        '/api/v1/rooms.leave',
        userHeader,
        { roomId: roomId }
    )

    if (!result.success) {
        console.log(`chat-room-service | getJoinedRoomList: failed, result=${JSON.stringify(result)}`)
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
        ownerUserId: rocketChatRoom.u.username
    }
}

function convertRoomType(roomType) {
    return roomTypeMap[roomType]
}