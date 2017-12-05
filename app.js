const http = require('http');
const qs = require('querystring');
const Guid = require('guid');
const getContent = require("./util/getContent.js");


//
// Config
//
const hostname = '0.0.0.0';
const port = 3000;
const eventStoreHostname = '127.0.0.1';


//
// Commands
//
const registerPayment = data => {
  const guid = Guid.create();
  const events = [
    {
      eventId: guid,
      eventType: "PaymentSucceeded",
      data: data
    }
  ];
  
  const request = http.request({
    host: eventStoreHostname,
    port: '2113',
    path: '/streams/payments',
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.eventstore.events+json'
    }
  });
  request.write(JSON.stringify(events));
  request.end();
}


//
// Projections
//
const getAmountDonate = () => getContent('http://' + eventStoreHostname + ':2113/projection/amountDonated/result');


//
// Routes
//
const routes = {
  '/': (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('Index. Check out <a href="/getAmountDonate">/getAmountDonate</a> and <a href="/registerPayment">/registerPayment</a> routes.');
  },
  
  '/getAmountDonate': (req, res) => getAmountDonate().then(result => {
    res.statusCode = 200;
    res.end(result);
  }).catch(error => {
    res.statusCode = 500;
    res.end(JSON.stringify({error: error.message || error}));
  }),

  '/registerPayment': (req, res) => {
    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        const data = qs.parse(body.toString());
        registerPayment(data);
        res.statusCode = 200;
        res.end('{"code":0}');
      });
      // TODO: error handling
    } else {
      res.end('Expecting a POST request');
    }
  }
};


//
// Server
//
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (routes.hasOwnProperty(req.url)) {
    routes[req.url](req, res);
  } else {
    res.end('No route found: ' + req.url);
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
