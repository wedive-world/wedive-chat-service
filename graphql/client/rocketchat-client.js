const { randomUUID } = require('crypto')
const WebSocket = require('ws')
const axios = require('axios')
const { cacheAdapterEnhancer } = require('axios-extensions')

class RocketChatClient {
    constructor() {
        if (!RocketChatClient.instance) {
            RocketChatClient.instance = this
        }

        this._emptyHeader = {
            "Content-Type": "application/json",
        }

        this._axios = axios.create({
            adapter: cacheAdapterEnhancer(axios.defaults.adapter, { enabledByDefault: false })
        })

        var LRU = require("lru-cache")

        this._userIdCache = new LRU(100)
        this._userTokenCache = new LRU(100)

        this.socketMap = new Map()

        return RocketChatClient.instance
    }

    async _checkAndUpdateUserCache(uid) {
        if (!this._userIdCache.has(uid) || !this._userIdCache.has(uid)) {
            let result = await this.login(uid)

            if (result.data.userId && result.data.authToken) {

                this._userIdCache.set(uid, result.data.userId)
                this._userTokenCache.set(uid, result.data.authToken)
            }
        }
    }

    async _getUserToken(uid) {
        return this._userTokenCache.get(uid)
    }

    async _getUserId(uid) {
        return this._userIdCache.get(uid)
    }

    async login(uid) {
        const hashPassword = this.generatePassword(uid)
        let result = await this.post('/api/v1/login',
            this._emptyHeader,
            {
                user: uid,
                password: hashPassword
            }
        )

        console.log(`RocketChatClient | login: result.status=${JSON.stringify(result.status)}`)

        return result
    }

    getAixosAdminHeader() {
        return {
            "Content-Type": "application/json",
            "X-User-Id": `${process.env.ADMIN_USER_ID}`,
            "X-Auth-Token": `${process.env.ADMIN_TOKEN}`
        }
    }

    async generateUserHeader(uid) {
        await this._checkAndUpdateUserCache(uid)
        return {
            "Content-Type": "application/json",
            "X-User-Id": `${await this._getUserId(uid)}`,
            "X-Auth-Token": `${await this._getUserToken(uid)}`,
        }
    }

    generatePassword(uid) {
        return require('crypto')
            .createHash('sha512')
            .update(uid)
            .digest('hex');
    }

    _getHost() {
        return process.env.ROCKET_CHAT_URL
    }

    _getWssHost() {
        return process.env.ROCKET_CHAT_WSS
    }

    async post(method, header, postData) {

        const url = `${this._getHost()}${method}`

        try {
            const { status, statusText, data } = await this._axios.post(
                url,
                postData,
                {
                    headers: header
                })

            console.log(`RocketChatClient | POST: url=${url} postData=${JSON.stringify(postData)} status=${status}`)// data=${JSON.stringify(data)}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | POST: method=${method} err=${JSON.stringify(err)}`)
            return err
        }
    }

    async get(method, header, queryParams) {

        try {
            const url = `${this._getHost()}${method}?${require('querystring').stringify(queryParams)}`
            console.log(`RocketChatClient | GET: url=${url}`)

            const { status, statusText, data } = await this._axios.get(
                url,
                {
                    headers: header
                })
            console.log(`RocketChatClient | GET: method=${method} queryParams=${JSON.stringify(queryParams)} status=${status}`)// data=${JSON.stringify(data)}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | GET: method=${method} err=${JSON.stringify(err)}`)
            return err
        }
    }

    async subscribeChatRoomMessage(uid, roomIds, subSession, onMessage) {
        console.log(`RocketChatClient | subscribe: uid=${uid}}, roomId=${roomIds}`)

        const loginSession = randomUUID()
        let userHeader = await this.generateUserHeader(uid)
        console.log(`RocketChatClient | userHeader created!`)

        const webSocket = new WebSocket(this._getWssHost())

        console.log(`RocketChatClient | socket created!, url=${webSocket.url} connected=${webSocket.readyState}`)

        webSocket.onopen = async function () {
            console.log('RocketChatClient | socket opened!');

            webSocket.send(JSON.stringify({
                "msg": "connect",
                "version": "1",
                "support": ["1"]
            }))
        };

        webSocket.onmessage = async function (event) {
            let response = JSON.parse(event.data)
            console.log(`RocketChatClient | onmessage: ${JSON.stringify(response)}`);

            if (response.msg == 'ping') {
                let rocketChatClient = new RocketChatClient()
                if (!rocketChatClient.socketMap.has(subSession)) {
                    return;
                }

                console.log('pong!');
                webSocket.send(JSON.stringify({
                    msg: 'pong'
                }))
                return
            }

            if (response.msg == 'connected') {

                webSocket.send(JSON.stringify({
                    msg: 'method',
                    method: 'login',
                    id: loginSession,
                    params: [
                        { 'resume': userHeader['X-Auth-Token'] }
                    ]
                }))
                return
            }

            if (response.msg == 'result' && response.id == loginSession) {

                webSocket.send(JSON.stringify({
                    "msg": "sub",
                    "id": subSession,
                    "name": "stream-room-messages",
                    "params": roomIds

                }))
                return
            }

            if (response.msg == 'changed'
                && response.collection == 'stream-room-messages'
                && roomIds.includes(response.fields.eventName)) {
                onMessage(response.fields.args)
            }
        }

        this.socketMap.set(subSession, webSocket)

        return subSession
    }

    expireSession(sessionId) {
        if (!this.socketMap.has(sessionId)) {
            return
        }

        let socket = this.socketMap.get(sessionId)
        this.socketMap.delete(sessionId)

        socket.close()
    }
}

module.exports = RocketChatClient