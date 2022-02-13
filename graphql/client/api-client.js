const { gql, GraphQLClient } = require('graphql-request')

class ApiClient {
    constructor() {
        if (!ApiClient.instance) {
            ApiClient.instance = this
        }

        this.client = new GraphQLClient('https://api.wedives.com/graphql')

        return ApiClient.instance
    }

    async getUserProfileImage(uid) {

        const query = gql`
            query GetUserByUid($uid: ID!) {
                getUserByUid(uid: $uid) {
                    profileImages {
                        thumbnailUrl
                    }
                }
            }
        `

        const variable = {
            uid: uid
        }

        try {
            console.log(`ApiClient | getUserProfileImage: variable=${JSON.stringify(variable)}`)
            const data = await this.client.request(query, variable)
            console.log(`ApiClient | getUserProfileImage: data=${JSON.stringify(data)}`)

            if (data.getUserByUid.profileImages && data.getUserByUid.profileImages.length > 0) {
                return data.getUserByUid.profileImages[0].thumbnailUrl
            }
            
        } catch (err) {
            console.log(`ApiClient | getUserProfileImage: ERROR, ${err}`)
        }

        return null
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