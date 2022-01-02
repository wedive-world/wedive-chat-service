class PubSubManager {

    constructor() {
        if (!PubSubManager.instance) {
            PubSubManager.instance = this
        }

        const { PubSub } = require('graphql-subscriptions')
        this._pubsub = new PubSub();

        return PubSubManager.instance
    }

    // pubsub.publish('POST_CREATED', { //pub
    //     postCreated: {
    //       author: 'Ali Baba',
    //       comment: 'Open sesame'
    //     }
    //   });
    subscribe(subject) {
        console.log(`PubSubManager | subscribe: subject=${subject}`)
        return this._pubsub.asyncIterator(subject)
    }

    publish(subject, data) {

        console.log(`PubSubManager | publish: subject=${subject} data=${JSON.stringify(data)}`)
        this._pubsub.publish(subject, data)
    }
}

module.exports = PubSubManager