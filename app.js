import http from 'http';
import url from 'url';
import fetch from 'node-fetch';
import parse from 'csv-parse';
import crypto from 'crypto';
import qs from 'querystring';
import {getPost, getContent} from "./util/network";
import auth from './util/auth';
import config from './config';
import projectionManager, {publishEvent} from './projections';

function validateHmac(body, requestHmac, referer = null) {
  let hmacKeys = config.hmacKey;
  if (referer) {
    hmacKeys = config.hmacKeys[referer];
  }
  if (!hmacKeys) {
    throw new Error('HMAC key not provided, referer: ' + referer);
  }
  const valid = hmacKeys.split(',').some(hmacKey => {
    var hmac = crypto.createHmac("sha256", hmacKey);
    hmac.update(body);
    const calculatedHmac = hmac.digest("base64");
    return requestHmac === calculatedHmac;
  })
  if (!valid) {
    console.log("HMAC mismatch, requestHmac, referer:", requestHmac, referer);
  }
  return valid;
}

const handleHook = (req, res, eventType, skipHmac = false, json = false) => {
  if (req.method === 'POST') {
    getPost(req).then(data => {
      const dataArray = json ? JSON.parse(data) : qs.parse(data);
      const referer = url.parse(req.url, true).query.referer;
      if (skipHmac || validateHmac(data, req.headers['content-hmac'], referer)) {
        if (referer) {
          dataArray.Referer = referer;
        }

        try {
          if (dataArray.Data) {
            const parsedData = JSON.parse(dataArray.Data);
            if (parsedData.userid && parsedData.contextid && dataArray.Amount) {
              const url = config.kabinetHostname + '/local/cohortautoenrol/approve.php?contextid=' + parsedData.contextid + '&userid=' + parsedData.userid + '&key=' + config.autoenrolKey + '&amount=' + dataArray.Amount;
              getContent(url)
                .then(result => console.info(result))
                .catch(error => console.error('Problem registring payment in LK:', url, error.message, dataArray.Data))
            }
          }
        } catch (e) {
          console.error('Problem registring payment in LK:', dataArray.Data);
        }

        return publishEvent(eventType, dataArray);
      } else {
        console.error('HMAC failed for request:', req.url, data);
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
const getESProjection = projectionName => getContent('http://' + config.eventStoreHostname + ':2113/projection/' + projectionName + '/result', {
  headers: {
    'Authorization': 'Basic ' + new Buffer(config.apiAuth).toString('base64')
  }
});

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
  return fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQrGXpnzRNZhRH2ssd_Jmre1Bh2fwTBgtrdNo5NSnAWhfIFPbehnCMRMxd1eTW0wh9gJJjeQiH1iXW3/pub?gid=723510395&single=true&output=csv')
    .then(res => res.text())
    .then(result => {
      return new Promise((resolve, reject) => {
        parse(result, {}, (err, output) => {
          if (err) {
            reject(err);
          }
          if (!output) {
            reject('Error parsing google spreadsheet');
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
    amount: projectionData.amount,
    byReferer: Object.assign({}, projectionData.byReferer)
  };
  Object.keys(result).forEach(key => {
    if (key === 'total') {
      mergedData.amount += result.total;
    } else {
      mergedData.byReferer[key] += result[key];
    }
  });
  return mergedData;
});

//
// Routes
//
const openRoutes = {
  '/': (req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('Nothing to see here. Walk along.');
  },

  '/subscribers': (req, res) => getContent('http://' + config.eventStoreHostname + ':2113/projection/all-payments2/result', {
    headers: {
      'Authorization': 'Basic ' + new Buffer(config.apiAuth).toString('base64')
    }
  })
    .then(result => JSON.parse(result))
    .then(result => {
      const subscribers = {};
      result.forEach(payment => {
        const query = url.parse(req.url, true).query;
        if (query.linkReferer ? (query.linkReferer === "-" ? !payment.linkReferer : payment.linkReferer === query.linkReferer) : true && query.referer ? payment.referer === query.referer : true) {
          const email = payment.email;
          const isFreshStart = query.startDate ? (Date.parse(payment.date) - Date.parse(query.startDate) > 0) : true;
          const isFreshEnd = query.endDate ? (Date.parse(query.endDate) - Date.parse(payment.date) > 0) : true;
          if (isFreshStart && isFreshEnd && email) {
            const currentAmount = (subscribers[email] && subscribers[email].amount) || 0;
            payment.amount += currentAmount;
            subscribers[email] = payment;
          }
        }
      });
      const json = JSON.stringify(Object.values(subscribers), null, 2);
      res.statusCode = 200;
      res.end(json);
    }).catch(error => {
      res.statusCode = 500;
      res.end(JSON.stringify({error: error.message}));
    }),

  '/getAmountDonate': (req, res) => getAmountDonate().then(result => {
    res.end(JSON.stringify(result));
    res.statusCode = 200;
  }).catch(error => {
    res.statusCode = 500;
    res.end(JSON.stringify({error: error.message}));
  }),

  // These routes are called by Cloudpayments webhooks

  '/pay': (req, res) => handleHook(req, res, 'PaymentSucceeded'),

  '/refund': (req, res) => handleHook(req, res, 'RefundSucceeded'),

  '/recurrent': (req, res) => handleHook(req, res, 'SubscriptionChanged'),

  '/fail': (req, res) => handleHook(req, res, 'PaymentFailed'),

  '/cancel': (req, res) => handleHook(req, res, 'PaymentCanceled')
};


//
// Server
//
const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  const urlWithoutParams = req.url.split('?')[0];
  if (openRoutes.hasOwnProperty(urlWithoutParams)) {
    openRoutes[urlWithoutParams](req, res);
  } else {
    auth(req, res, (req, res) => {
      if (req.url.indexOf("/publish-event/") === 0) {
        handleHook(req, res, req.url.substring(15), true, true);
      } else if (req.url.indexOf("/es-projection/") === 0) {
        getESProjection(req.url.substring(15)).then(result => {
          res.statusCode = 200;
          res.end(result);
        }).catch(error => {
          res.statusCode = 500;
          res.end(JSON.stringify({error: error.message}));
        });
      } else if (req.url.indexOf("/projection/") === 0) {
        res.statusCode = 200;
        res.end(JSON.stringify(projectionManager.getResult(req.url.substring(12)), null, 2));
      } else {
        res.end('No route found: ' + req.url);
      }
    });
  }
});

server.listen(config.port, config.hostname, () => {
  console.info(`Server running at http://${config.hostname}:${config.port}/`);
});
