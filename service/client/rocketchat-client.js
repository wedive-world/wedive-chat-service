class RocketChatClient {
    constructor() {
        if (!RocketChatClient.instance) {
            RocketChatClient.instance = this
        }

        this.adminHeader = [
            "Content-Type:application/json",
            `X-User-Id:${process.env.ADMIN_USER_ID}`,
            `X-Auth-Token:${process.env.ADMIN_TOKEN}`,
        ]

        this._emptyHeader = [
            "Content-Type:application/json",
        ]

        this._host = process.env.ROCKET_CHAT_URL

        this._curly = require('node-libcurl').curly
        
        var LRU = require("lru-cache")

        this._userIdCache = new LRU(100)
        this._userTokenCache = new LRU(100)

        return RocketChatClient.instance
    }

    async _checkAndUpdateUserCache(email) {
        if (!this._userIdCache.has(email) || !this._userIdCache.has(email)) {
            let result = await this.login(email)

            if (result.userId && result.authToken) {

                this._userIdCache.set(email, result.userId)
                this._userTokenCache.set(email, result.authToken)
            }
        }
    }

    async _getUserToken(email) {
        return this._userTokenCache.get(email)
    }

    async _getUserId(email) {
        return this._userIdCache.get(email)
    }

    async login(email) {
        const hashPassword = this.generatePassword(email)
        let result = await this.post('/api/v1/login',
            this._emptyHeader,
            {
                user: email,
                password: hashPassword
            }
        )

        console.log(`RocketChatClient | login: result=${JSON.stringify(result)}`)

        return result
    }

    async generateUserHeader(email) {
        await this._checkAndUpdateUserCache(email)
        return [
            "Content-Type:application/json",
            `X-User-Id:${this._getUserId(email)}`,
            `X-Auth-Token:${this._getUserToken(email)}`,
        ]
    }

    generatePassword(email) {
        return require('crypto')
            .createHash('sha512')
            .update(email)
            .digest('hex');
    }

    async post(method, header, postData) {

        try {
            const { statusCode, data, headers } = await this._curly.post(
                `${this._host}${method}`,
                {
                    postFields: JSON.stringify(postData),
                    httpHeader: header
                }
            )

            console.log(`RocketChatClient | POST: method=${method} statusCode=${JSON.stringify(statusCode)} data=${data}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | POST: method=${method} err=${JSON.stringify(err)}`)

            return err
        }
    }

    async get(method, header, queryParams) {

        try {
            const { statusCode, data, headers } = await this._curly.get(
                `${this._host}${method}?${require('querystring').stringify(queryParams)}`,
                {
                    httpHeader: header
                }
            )
            console.log(`RocketChatClient | GET: method=${method} statusCode=${JSON.stringify(statusCode)} data=${data}`)
            return data

        } catch (err) {
            console.log(`RocketChatClient | GET: method=${method} err=${JSON.stringify(err)}`)

            return err
        }
    }
}

module.exports = RocketChatClient