import http from 'http';
import fs from 'fs';
import path from 'path';
import Guid from 'guid';
import crypto from 'crypto';
import qs from 'querystring';
import {getPost, getContent} from "./util/network";
import {publishEvent} from './util/publishEvent';
import config from './config';
import projectionManager from './projections';

function validateHmac(body, requestHmac) {
  var hmac = crypto.createHmac('sha256', config.hmacKey);
  hmac.update(body);
  const calculatedHmac = hmac.digest('base64');
  return requestHmac === calculatedHmac;
}

const handleHook = (req, res, stream, eventType) => {
  if (req.method === 'POST') {
    getPost(req).then(data => {
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
const getAmountDonate = () => getContent('http://' + config.eventStoreHostname + ':2113/projection/amountDonated/result');

const getEmails = () => getContent('http://' + config.eventStoreHostname + ':2113/projection/emails/result');


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

  '/getEmails': (req, res) => getEmails().then(result => {
    res.statusCode = 200;
    res.end(result);
  }).catch(error => {
    res.statusCode = 500;
    res.end(JSON.stringify({error: error.message}));
  }),

  // These routes are called by Cloudpayments webhooks

  '/pay': (req, res) => handleHook(req, res, 'data', 'PaymentSucceeded'),

  '/refund': (req, res) => handleHook(req, res, 'data', 'RefundSucceeded'),

  '/recurrent': (req, res) => handleHook(req, res, 'data', 'SubscriptionChanged')
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
  } else if (req.url.indexOf("/projection/") === 0) {
    res.statusCode = 200;
    res.end(JSON.stringify(projectionManager.getResult(req.url.substring(12)), null, 2));
  } else {
    res.end('No route found: ' + req.url);
  }
});

server.listen(config.port, config.hostname, () => {
  console.log(`Server running at http://${config.hostname}:${config.port}/`);
});
