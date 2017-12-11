const http = require('http');
const Guid = require('guid');
const crypto = require('crypto');
const qs = require('querystring');
const network = require("./util/network.js");


//
// Config
//
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;
const eventStoreHostname = process.env.ES_HOST || '127.0.0.1';
const hmacKey = process.env.HMAC_KEY;

function validateHmac(body, requestHmac) {
  var hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(body);
  const calculatedHmac = hmac.digest('base64');
  return requestHmac === calculatedHmac;
}


const publishEvent = (stream, eventType, data) => {
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


const handleHook = (req, res, stream, eventType) => {
  if (req.method === 'POST') {
    network.getPost(req).then(data => {
      if (validateHmac(data, req.headers['content-hmac'])) {
        return publishEvent(stream, eventType, qs.parse(data));
      } else {
        console.log('HMAC failed for request:', req);
        throw new Error('HMAC not valid');
      }
    })
      .then(() => {
        res.statusCode = 200;
        // Cloudpayments expects this code
        res.end('{"code":0}');
      }).catch(error => {
        res.statusCode = 500;
        res.end(error.message);
      });
  } else {
    res.end('Expecting a POST request');
  }
};


//
// Projections
//
const getAmountDonate = () => network.getContent('http://' + eventStoreHostname + ':2113/projection/amountDonated/result');


//
// Routes
//
const routes = {
  '/': (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('Nothing to see here. Walk along.');
  },
  
  '/getAmountDonate': (req, res) => getAmountDonate().then(result => {
    res.statusCode = 200;
    res.end(result);
  }).catch(error => {
    res.statusCode = 500;
    res.end(JSON.stringify({error: error.message}));
  }),

  // These routes are called by Cloudpayments webhooks

  '/pay': (req, res) => handleHook(req, res, 'payments', 'PaymentSucceeded'),

  '/refund': (req, res) => handleHook(req, res, 'payments', 'RefundSucceeded'),

  '/recurrent': (req, res) => handleHook(req, res, 'subscriptions', 'SubscriptionChanged')
};


//
// Server
//
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
 
  if (routes.hasOwnProperty(req.url)) {
    routes[req.url](req, res);
  } else {
    res.end('No route found: ' + req.url);
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
