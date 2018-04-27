import http from 'http';
import path from 'path';
import Guid from 'guid';

const eventStoreHostname = process.env.ES_HOST || '127.0.0.1';

export const publishEvent = (stream, eventType, data) => {
  return new Promise((resolve, reject) => {
    const guid = Guid.create();
    const events = [
      {
        eventId: guid,
        eventType: eventType,
        data: data
      }
    ];
    
    const request = http.request({
      host: eventStoreHostname,
      port: '2113',
      path: '/streams/' + stream,
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.eventstore.events+json'
      }
    }, response => {
      if (response.statusCode < 200 || response.statusCode > 299) {
        reject(new Error('Failed to publish and event, status code: ' + response.statusCode));
      } else {
        resolve(true);
      }
    });
    request.write(JSON.stringify(events));
    request.end();
  });
};
