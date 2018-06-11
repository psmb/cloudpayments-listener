//
// Config
//
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;
const eventStoreHostname = process.env.ES_HOST || '127.0.0.1';
const hmacKey = process.env.HMAC_KEY;
const eventStorePass = process.env.ES_PASS || 'changeit';
const stream = process.env.ES_STREAM || 'data'
const apiAuth = process.env.SFI_API_AUTH || 'api:changeit'

export default {hostname, port, eventStoreHostname, hmacKey, eventStorePass, apiAuth, stream};