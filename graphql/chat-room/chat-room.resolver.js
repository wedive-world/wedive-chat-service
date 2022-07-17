const RocketChatClient = require("../client/rocketchat-client")
const rocketChatClient = new RocketChatClient()

const ApiClient = require("../client/api-client")
const apiClient = new ApiClient()
const { randomUUID } = require('crypto')

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
            console.log(`chat-room-resolver | ChatRoomInfo | chatRoom: parent=${JSON.stringify(parent)}`)
            return await getChatRoom(context.uid, parent.chatRoom)
        }
    },

    ChatRoomInfo: {
        async chatRoom(parent, args, context, info) {
            console.log(`chat-room-resolver | ChatRoomInfo | chatRoom: parent=${JSON.stringify(parent)}`)
            return await getChatRoom(context.uid, parent.roomId)
        }
    },

    ChatRoom: {
        async divingInfo(parent, args, context, info) {
            if (parent.type == 'channel') {
                let diving = await apiClient.getDivingInfo(parent._id)

                if (!diving) {
                    return null
                }

                let divingInfo = { title: diving.title }

                const oneDay = 1000 * 60 * 60 * 24;

                const startedAt = new Date(diving.startedAt)
                const today = new Date()
                const diffInTime = startedAt.getTime() - today.getTime();

                divingInfo.daysLeft = Math.round(diffInTime / oneDay);

                if (diving.diveSites && diving.diveSites.length > 0) {
                    divingInfo.name = diving.diveSites[0].name

                } else if (diving.divePoints && diving.divePoints.length > 0) {
                    divingInfo.name = diving.divePoints[0].name

                } else if (diving.diveCenters && diving.diveCenters.length > 0) {
                    divingInfo.name = diving.diveCenters[0].name
                }

                return divingInfo
            }
        },
    },

    Query: {
        async getJoinedRoomList(parent, args, context, info) {
            console.log(`query | getJoinedRoomList: context=${JSON.stringify(context)}`)
            return await getJoinedRoomList(context.uid)
        },
        async getChatRoomInfo(parent, args, context, info) {
            console.log(`query | getChatRoomInfo: context=${JSON.stringify(context)}`)
            return {
                roomId: args.roomId,
                skip: args.skip,
                limit: args.limit
            }
        },
    },

    Mutation: {

        async leaveRoom(parent, args, context, info) {
            console.log(`mutation | leaveRoom: args=${JSON.stringify(args)}`)
            console.log(`mutation | leaveRoom: context=${JSON.stringify(context)}`)
            return await leaveRoom(context.uid, args.roomId)
        },

        async leaveChannel(parent, args, context, info) {
            console.log(`mutation | leaveChannel: args=${JSON.stringify(args)}`)
            console.log(`mutation | leaveChannel: context=${JSON.stringify(context)}`)
            return await leaveChannel(context.uid, args.roomId)
        },

        async deleteRoom(parent, args, context, info) {
            console.log(`mutation | deleteRoom: args=${JSON.stringify(args)}`)
            console.log(`mutation | deleteRoom: context=${JSON.stringify(context)}`)
            return await deleteRoom(context.uid, args.roomId)
        },

        async markRead(parent, args, context, info) {
            console.log(`mutation | markRead: args=${JSON.stringify(args)}`)
            console.log(`mutation | markRead: context=${JSON.stringify(context)}`)
            return await markRead(context.uid, args.roomId)
        },

        async createRoom(parent, args, context, info) {
            return await createRoom(context.uid, args.title, args.membersUids)
        },

        async setRoomTitle(parent, args, context, info) {
            return await setDescription(context.uid, args.roomId, args.title)
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

    let userHeader = await rocketChatClient.generateUserHeader(uid)

    let result = await rocketChatClient.get('/api/v1/rooms.get', userHeader)
    if (!result.success) {
        console.log(`chat-room-resolver | getJoinedRoomList: failed, result=${JSON.stringify(result)}`)
        return null
    }
    // console.log(`chat-room-resolver | getJoinedRoomList: result=${JSON.stringify(result)}`)

    let subscriptions = await rocketChatClient.get('/api/v1/subscriptions.get', userHeader)
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

    let userHeader = await rocketChatClient.generateUserHeader(uid)
    let queryParams = {
        roomId: roomId
    }

    let result = await rocketChatClient.get('/api/v1/rooms.info', userHeader, queryParams)
    if (!result.success) {
        console.log(`chat-room-resolver | getChatRoom: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertChatRoom(result.room)
}

async function getChannelInfo(uid, roomId) {

    let result = await rocketChatClient.get(
        '/api/v1/channels.info',
        await rocketChatClient.generateUserHeader(uid),
        { roomId: roomId }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | getChatRoom: failed, result=${JSON.stringify(result)}`)
        return null
    }

    return convertChatRoom(result.channel)
}

async function leaveChannel(uid, channelId) {

    let result = await rocketChatClient.post(
        '/api/v1/channels.leave',
        await rocketChatClient.generateUserHeader(uid),
        { roomId: channelId }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | leaveChannel: failed, result=${JSON.stringify(result)}`)
        return {
            success: false,
            reason: JSON.stringify(result)
        }
    }

    return {
        success: true
    }
}

async function leaveRoom(uid, roomId) {

    let result = await rocketChatClient.post(
        '/api/v1/rooms.leave',
        await rocketChatClient.generateUserHeader(uid),
        { roomId: roomId }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | leaveRoom: failed, result=${JSON.stringify(result)}`)
        return {
            success: false,
            reason: JSON.stringify(result)
        }
    }

    return {
        success: true
    }
}

async function deleteRoom(uid, roomId) {

    let result = await rocketChatClient.post(
        '/api/v1/channels.delete',
        await rocketChatClient.generateUserHeader(uid),
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

    let result = await rocketChatClient.post(
        '/api/v1/subscriptions.read',
        await rocketChatClient.generateUserHeader(uid),
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
async function createRoom(uid, title, membersUids) {

    let userHeader = await rocketChatClient.generateUserHeader(uid)

    let result = await rocketChatClient.post(
        '/api/v1/channels.create',
        userHeader,
        {
            name: randomUUID(),
            members: membersUids
        }
    )

    if (!result.success) {
        console.log(`chat-room-resolver | createRoom: failed, result=${JSON.stringify(result)}`)
        return null
    }

    let descriptionResult = await setDescription(uid, result.channel._id, title)

    if (!descriptionResult.success) {
        console.log(`chat-room-resolver | setDescription: failed, result=${JSON.stringify(descriptionResult)}`)
    }

    return await getChannelInfo(uid, result.channel._id)
}

async function setDescription(uid, roomId, title) {

    let userHeader = await rocketChatClient.generateUserHeader(uid)

    let descriptionResult = await rocketChatClient.post(
        '/api/v1/channels.setDescription',
        userHeader,
        {
            roomId: roomId,
            description: title
        }
    )

    if (!descriptionResult.success) {
        console.log(`chat-room-resolver | setDescription: failed, result=${JSON.stringify(descriptionResult)}`)
        return {
            success: false
        }
    }

    return {
        success: true
    }
}

async function invite(uid, roomId, userId) {

    let userHeader = await rocketChatClient.generateUserHeader(uid)

    let result = await rocketChatClient.post(
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

    let userHeader = await rocketChatClient.generateUserHeader(uid)

    let result = await rocketChatClient.post(
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
        title: rocketChatRoom.description,

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