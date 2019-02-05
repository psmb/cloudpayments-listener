//
// Config
//
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;
const eventStoreHostname = process.env.ES_HOST || '127.0.0.1';
// legacy, to be removed
const hmacKey = process.env.HMAC_KEY;
const hmacKeys = {
    chapel: process.env.HMAC_KEY_CHAPEL,
    projects: process.env.HMAC_KEY_CHAPEL,
    social: process.env.HMAC_KEY_CHAPEL
};

process.env.HMAC_KEY;
const eventStorePass = process.env.ES_PASS || 'changeit';
const stream = process.env.ES_STREAM || 'data';
const apiAuth = process.env.SFI_API_AUTH || 'api:changeit';

export default {hostname, port, eventStoreHostname, hmacKey, hmacKeys, eventStorePass, apiAuth, stream};
