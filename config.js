//
// Config
//
const hostname = "0.0.0.0";
const port = process.env.PORT || 3000;
const eventStoreHostname = process.env.ES_HOST || "127.0.0.1";
const kabinetHostname = process.env.KABINET_HOST || "https://kabinet.sfi.ru";
// legacy, to be removed
const hmacKey = process.env.HMAC_KEY;
const hmacKeys = {
  projects: process.env.HMAC_KEY_PROJECTS,
  chapel: process.env.HMAC_KEY_CHAPEL,
  social: process.env.HMAC_KEY_SOCIAL,
  publishing: process.env.HMAC_KEY_PUBLISHING,
  kabinet: process.env.HMAC_KEY_KABINET,
};

const eventStorePass = process.env.ES_PASS || "changeit";
const stream = process.env.ES_STREAM || "data";
const apiAuth = process.env.SFI_API_AUTH || "api:changeit";

const autoenrolKey = process.env.AUTOENROL_KEY || "changeit";

export default {
  hostname,
  port,
  eventStoreHostname,
  kabinetHostname,
  hmacKey,
  hmacKeys,
  eventStorePass,
  apiAuth,
  stream,
  autoenrolKey,
};
