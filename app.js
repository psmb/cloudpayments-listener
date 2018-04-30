import http from 'http';
import fs from 'fs';
import path from 'path';
import Guid from 'guid';
import parse from 'csv-parse';
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
const getEmails = () => getContent('http://' + config.eventStoreHostname + ':2113/projection/emails/result');

const makeCache = (func, timeout) => {
  let cache = null;
  let timestamp = null;
  return (...args) => {
    if (!cache || Date.now() > timeout + timestamp) {
      cache = func(...args);
      timestamp = Date.now();
    }
    return cache;
  }
};

const getManualData = makeCache(() => {
  return getContent('https://docs.google.com/spreadsheets/d/e/2PACX-1vQrGXpnzRNZhRH2ssd_Jmre1Bh2fwTBgtrdNo5NSnAWhfIFPbehnCMRMxd1eTW0wh9gJJjeQiH1iXW3/pub?gid=723510395&single=true&output=csv').then(result => {
    return new Promise((resolve, reject) => {
      parse(result, {}, (err, output) => {
        if (err) {
          reject(err);
        }
        resolve(output[1].reduce((acc, value, index) => {
          if (value && value !== 'Сумма') {
            value = value === 'Итого' ? 'total' : value;
            acc[value] = parseFloat(output[output.length - 1][index].replace(/\s/g, ''));
          }
          return acc;
        }, {}));
      });
    });
  });
}, 1000 * 3600 * 24);

const getAmountDonate = () => getManualData().then(result => {
    const projectionData = projectionManager.getResult('amountDonated');
    let mergedData = {
      byReferer: Object.assign({}, projectionData.byReferer)
    };
    Object.keys(result).forEach(key => {
      if (key === 'total') {
        mergedData.amount = result.total;
      } else {
        mergedData.byReferer[key] += result[key];
      }
    });
    return mergedData;
  });

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
    res.end(JSON.stringify(result));
    res.statusCode = 200;
  }).catch(error => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
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
