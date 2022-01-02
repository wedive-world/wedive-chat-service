const { gql, GraphQLClient } = require('graphql-request')

class ApiClient {
    constructor() {
        if (!ApiClient.instance) {
            ApiClient.instance = this
        }

        this.client = new GraphQLClient('https://api.wedives.com/graphql')

        return ApiClient.instance
    }

    async getFcmTokenList(uidList) {

        const query = gql`
            query GetUsersByUid($uids: [ID]) {
                getUsersByUid(uids: $uids) {
                    fcmToken
                }
            }
        `

        const variable = {
            uids: uidList
        }

        try {
            console.log(`ApiClient | getFcmTokenList: variable=${JSON.stringify(variable)}`)
            const data = await this.client.request(query, variable)
            console.log(`ApiClient | getFcmTokenList: data=${JSON.stringify(data)}`)

            return data.getUsersByUid.map(user => user.fcmToken)

        } catch (err) {
            console.log(`ApiClient | getFcmTokenList: ERROR, ${err}`)
        }
    }
}

module.exports = ApiClient