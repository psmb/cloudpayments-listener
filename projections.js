import client from 'node-eventstore-client';
import uuid from 'uuid';
import http from 'http';
import fs from 'fs';
import path from 'path';
import Guid from 'guid';
import crypto from 'crypto';
import qs from 'querystring';
import network from "./util/network.js";
import config from './config';
import ProjectionManager from './lib/projectionManager';

import amountDonated from './projections/amountDonated';
import makeInstant from './projections/pendingEmails-makeInstant';
import once2mLastPayment from './projections/pendingEmails-once-2m-last-payment';
import once2wNotRecurrent from './projections/pendingEmails-once-2w-not-recurrent';

const projectionManager = new ProjectionManager();
export default projectionManager;

projectionManager.registerProjection('amountDonated', amountDonated);
projectionManager.registerProjection('once-instant', makeInstant('once-instant', false));
projectionManager.registerProjection('recurrent-instant', makeInstant('recurrent-instant', true));
projectionManager.registerProjection('recurrent-1d', makeInstant('recurrent-1d', true));
projectionManager.registerProjection('once-2m-last-payment', once2mLastPayment);
projectionManager.registerProjection('once-2w-not-recurrent', once2wNotRecurrent);

//
// Connect to ES
//
const liveProcessingStarted = () => {
    console.log("Caught up with previously stored events. Listening for new events.");
}

const subscriptionDropped = (subscription, reason, error) =>
    console.log(error ? error : "Subscription dropped.");

const credentials = new client.UserCredentials("admin", "changeit");

const settings = {};
const endpoint = "tcp://eventstore:1113";
const connection = client.createConnection(settings, endpoint);

connection.connect().catch(err => console.log(err));

connection.once("connected", tcpEndPoint => {
    const subscription = connection.subscribeToStreamFrom(
        'data',
        0,
        false,
        (stream, event) => projectionManager.onEvent({
            eventId: event.originalEvent.eventId,
            eventType: eventType,
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
