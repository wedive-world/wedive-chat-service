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
        getMessaging(getApp()).sendMulticast({
            data: {
                event: event,
                messageData: data
            },
            tokens: tokenList
        })
    }
}

module.exports = FirebaseClient