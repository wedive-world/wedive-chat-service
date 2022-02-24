const { initializeApp, getApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging')
class FirebaseClient {
    constructor() {
        if (!FirebaseClient.instance) {
            FirebaseClient.instance = this
        }

        return FirebaseClient.instance
    }

    async sendMulticast(tokenList, event, data) {
        if (!tokenList || tokenList.length == 0) {
            return
        }
        // console.log(`FirebaseClient | sendMulticast: tokenList=${JSON.stringify(tokenList)}, event=${event}, data=${JSON.stringify(data)}`)

        let result = getMessaging(getApp()).sendMulticast({
            data: {
                event: event,
                ...data
            },
            tokens: tokenList
        })

        // console.log(`FirebaseClient | sendMulticast: result=${JSON.stringify(result)}`)
    }
}

module.exports = FirebaseClient