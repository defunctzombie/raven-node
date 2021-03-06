var http = require('http');
var https = require('https');

// default port for protocols
var k_default_port = {
    http: 80,
    https: 443,
};

module.exports.send = function(client, auth, message, cb) {
    var self = this;

    var dsn = client.dsn;

    var proto = (client.dsn.protocol === 'http') ? http : https;
    var host = client.dsn.host;
    var port = client.dsn.port || k_default_port[client.dsn.protocol];

    var options = {
        host: host,
        path: client.dsn.path + 'api/store/',
        headers: {
            'X-Sentry-Auth': auth,
            'Content-Type': 'application/octet-stream',
            'Content-Length': message.length
        },
        method: 'POST',
        port: port
    };

    var req = proto.request(options, function(res){
        var body = '';

        res.setEncoding('utf8');
        res.on('data', function(chunk) {
            body += chunk;
        });

        res.on('end', function() {
            if (res.statusCode != 200) {
                var err = new Error();
                err.message = 'http response not OK: ' + res.statusCode;
                err.body = body;

                return cb(err);
            }

            return cb();
        });

        res.on('error', function(err) {
            cb(err);
        });
    });

    req.on('error', function(err){
        cb(err);
    });

    req.end(message);
}

