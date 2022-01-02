class FirebaseClient {
    constructor() {
        if (!FirebaseClient.instance) {
            FirebaseClient.instance = this
        }

        const { initializeApp } = require('firebase-admin/app');
        const { getMessaging } = require('firebase-admin/messaging')
        const firebaseApp = initializeApp()
        this._firebaseMessaging = getMessaging(firebaseApp)

        return FirebaseClient.instance
    }

    async sendMulticast(tokenList, event, data) {

    }
}

module.exports = FirebaseClient