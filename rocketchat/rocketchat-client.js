class RocketChatClient {
    constructor() {
        if (!RocketChatClient.instance) {
            RocketChatClient.instance = this
        }

        this._header = [
            "Content-Type:application/json",
            `X-User-Id:${process.env.ADMIN_USER_ID}`,
            `X-Auth-Token:${process.env.ADMIN_TOKEN}`,
        ]

        this._host = process.env.ROCKET_CHAT_URL

        this._curly = require('node-libcurl').curly

        return RocketChatClient.instance
    }

    async createUser(email, name, userName) {

        const hashPassword = require('crypto')
            .createHash('sha512')
            .update(email)
            .digest('hex');

        const postData = {
            email: email,
            name: name,
            password: hashPassword,
            username: userName,
            joinDefaultChannels: false,
        }

        try {

            const { statusCode, data, headers } = await this._curly.post(
                `${this._host}/api/v1/users.create`,
                {
                    postFields: JSON.stringify(postData),
                    httpHeader: this._header
                }
            )

            console.log(`RocketChatClient | createUser: statusCode=${JSON.stringify(statusCode)}`)
            console.log(`RocketChatClient | createUser: data=${JSON.stringify(data)}`)
            console.log(`RocketChatClient | createUser: headers=${JSON.stringify(headers)}`)

            return data

        } catch (err) {
            console.log(`RocketChatClient | createUser: err=${JSON.stringify(err)}`)

            return err
        }
    }
}

module.exports = RocketChatClient