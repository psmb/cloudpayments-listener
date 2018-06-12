import client from 'node-eventstore-client';
import config from './config';
import ProjectionManager from './lib/projectionManager';
import uuid from 'uuid';

import amountDonated from './projections/amountDonated';
import makeInstant from './projections/pendingEmails-makeInstant';
import once2mLastPayment from './projections/pendingEmails-once-2m-last-payment';
import once2wNotRecurrent from './projections/pendingEmails-once-2w-not-recurrent';
import recurrent1D from './projections/pendingEmails-recurrent-1d';
import failed from './projections/pendingEmails-failed'
import reactivationFailed from './projections/pendingEmails-reactivation-failed-recurrent';
import reactivationCancelled from './projections/pendingEmails-reactivation-cancelled-recurrent';

const projectionManager = new ProjectionManager();
export default projectionManager;

projectionManager.registerProjection('amountDonated', amountDonated);
projectionManager.registerProjection('once-instant', makeInstant('once-instant', false));
projectionManager.registerProjection('recurrent-instant', makeInstant('recurrent-instant', true, 'onlyFirst'));
projectionManager.registerProjection('recurrent-instant-next', makeInstant('recurrent-instant-next', true, 'onlyNext'));
projectionManager.registerProjection('recurrent-1d', recurrent1D);
projectionManager.registerProjection('once-2m-last-payment', once2mLastPayment);
projectionManager.registerProjection('once-2w-not-recurrent', once2wNotRecurrent);
projectionManager.registerProjection('failed', failed);
projectionManager.registerProjection('reactivation-failed-recurrent', reactivationFailed);
projectionManager.registerProjection('reactivation-cancelled-recurrent', reactivationCancelled);

//
// Connect to ES
//
const liveProcessingStarted = () => {
    console.log("Caught up with previously stored events. Listening for new events.");
}

const subscriptionDropped = (subscription, reason, error) =>
    console.log(error ? error : "Subscription dropped.");

const credentials = new client.UserCredentials("admin", config.eventStorePass);

const settings = {};
const endpoint = "tcp://eventstore:1113";
const connection = client.createConnection(settings, endpoint);

connection.connect().catch(err => console.log(err));

connection.once("connected", tcpEndPoint => {
    const subscription = connection.subscribeToStreamFrom(
        config.stream,
        null,
        false,
        (stream, event) => projectionManager.onEvent({
            eventId: event.originalEvent.eventId,
            eventType: event.originalEvent.eventType,
            data: JSON.parse(event.originalEvent.data.toString())
        }),
        liveProcessingStarted,
        subscriptionDropped,
        credentials
    );
    console.log(`Connected to eventstore at ${tcpEndPoint.host}:${tcpEndPoint.port}`);
})

connection.on("error", err =>
    console.log(`Error occurred on connection: ${err}`)
);

connection.on("closed", reason =>
    console.log(`Connection closed, reason: ${reason}`)
);

export const publishEvent = (eventType, eventData) => {
    const eventId = uuid.v4();
    const event = client.createJsonEventData(eventId, eventData, null, eventType);
    connection.appendToStream(config.stream, client.expectedVersion.any, event)
        .then(function (result) {
            console.log("Stored event:", eventId);
        })
        .catch(function (err) {
            console.error(err);
        });

}
