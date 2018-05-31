import config from './../config';

const auth = (req, res, callback) => {
    const auth = req.headers['authorization'];
    if (!auth) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="sfi.ru API"');
        res.end('<h1>Who are you?</h1>');
    } else {
        const buf = new Buffer(auth.split(' ')[1], 'base64');
        const plainAuth = buf.toString();
        if (plainAuth === config.apiAuth) {
            callback(req, res);
        } else {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="sfi.ru API"');
            res.end('<h1>The pass didn\'t really work. Try again?</h1>');
        }
    }
}
export default auth;