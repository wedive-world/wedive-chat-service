class RocketChatClient {
    constructor() {
        if (!RocketChatClient.instance) {
            RocketChatClient.instance = this
        }

        this._emptyHeader = [
            "Content-Type:application/json",
        ]

        this._curly = require('node-libcurl').curly
        this._axios = require('axios').default

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

    getAixosAdminHeader() {
        return {
            "Content-Type": "application/json",
            "X-User-Id": `${process.env.ADMIN_USER_ID}`,
            "X-Auth-Token": `${process.env.ADMIN_TOKEN}`
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

        // console.log(`RocketChatClient | login: result=${JSON.stringify(result)}`)

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

        const url = `${this._getHost()}${method}`
        console.log(`RocketChatClient | POST: url=${url} header=${JSON.stringify(header)} postData=${JSON.stringify(postData)}`)

        try {
            const { status, statusText, data } = await this._axios.post(
                url,
                postData,
                {
                    headers: header
                })

            console.log(`RocketChatClient | POST: status=${status} statusText=${statusText} data=${JSON.stringify(data)}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | POST: method=${method} err=${JSON.stringify(err)}`)
            return err
        }
    }

    async get(method, header, queryParams) {
        console.log(`RocketChatClient | GET: method=${method} header=${JSON.stringify(header)} queryParams=${JSON.stringify(queryParams)}`)

        try {
            const url = `${this._getHost()}${method}?${require('querystring').stringify(queryParams)}`
            console.log(`RocketChatClient | GET: url=${url}`)

            const { status, statusText, data } = await this._axios.get(
                url,
                {
                    headers: header
                })
            console.log(`RocketChatClient | GET: status=${status}, statusText=${statusText} data=${JSON.stringify(data)}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | GET: method=${method} err=${JSON.stringify(err)}`)
            return err
        }
    }
}

module.exports = RocketChatClient