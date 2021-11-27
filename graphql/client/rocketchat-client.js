class RocketChatClient {
    constructor() {
        if (!RocketChatClient.instance) {
            RocketChatClient.instance = this
        }

        this._emptyHeader = [
            "Content-Type:application/json",
        ]

        this._curly = require('node-libcurl').curly
        var LRU = require("lru-cache")

        this._userIdCache = new LRU(100)
        this._userTokenCache = new LRU(100)

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

    getAdminHeader() {
        return [
            "Content-Type:application/json",
            `X-User-Id:${process.env.ADMIN_USER_ID}`,
            `X-Auth-Token:${process.env.ADMIN_TOKEN}`,
        ]
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

        console.log(`RocketChatClient | login: result=${JSON.stringify(result)}`)

        return result
    }

    async generateUserHeader(uid) {
        await this._checkAndUpdateUserCache(uid)
        return [
            "Content-Type:application/json",
            `X-User-Id:${await this._getUserId(uid)}`,
            `X-Auth-Token:${await this._getUserToken(uid)}`,
        ]
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

    async post(method, header, postData) {

        console.log(`RocketChatClient | POST: method=${method} header=${JSON.stringify(header)} postData=${JSON.stringify(postData)}`)

        try {
            const { statusCode, data, headers } = await this._curly.post(
                `${this._getHost()}${method}`,
                {
                    postFields: JSON.stringify(postData),
                    httpHeader: header
                })

            console.log(`RocketChatClient | POST: method=${method} statusCode=${JSON.stringify(statusCode)} data=${JSON.stringify(data)}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | POST: method=${method} err=${JSON.stringify(err)}`)
            return err
        }
    }

    async get(method, header, queryParams) {

        try {
            const { statusCode, data, headers } = await this._curly.get(
                `${this._getHost()}${method}?${require('querystring').stringify(queryParams)}`,
                {
                    httpHeader: header
                })
            console.log(`RocketChatClient | GET: method=${method} statusCode=${JSON.stringify(statusCode)} data=${JSON.stringify(data)}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | GET: method=${method} err=${JSON.stringify(err)}`)

            return err
        }
    }
}

module.exports = RocketChatClient