var raven = require('../')
  , fs = require('fs')
  , nock = require('nock')
  , mockudp = require('mock-udp')
  , zlib = require('zlib')
  , assert = require('assert');

var dsn = 'https://public:private@app.getsentry.com/269';

var _oldConsoleWarn = console.warn;
function mockConsoleWarn() {
    console.warn = function() {
        console.warn._called = true;
    };
    console.warn._called = false;
}
function restoreConsoleWarn() {
    console.warn = _oldConsoleWarn;
}

describe('raven.version', function(){
    it('should be valid', function(){
        raven.version.should.match(/^\d+\.\d+\.\d+(-\w+)?$/);
    });

    it('should match package.json', function(){
        var version = require('../package.json').version;
        raven.version.should.equal(version);
    });
});

describe('raven.Client', function(){
    var client;
    beforeEach(function(){
        process.env.NODE_ENV='production';
        client = new raven.Client(dsn);
    });

    it('should parse the DSN with options', function(){
        var expected = {
            protocol: 'https',
            public_key: 'public',
            private_key: 'private',
            host: 'app.getsentry.com',
            path: '',
            project_id: 269,
            port: 0
        };
        var client = new raven.Client(dsn, {name: 'YAY!'});
        client.dsn.should.eql(expected);
        client.name.should.equal('YAY!');
    });

    it('should pull SENTRY_DSN from environment', function(){
        var expected = {
            protocol: 'https',
            public_key: 'abc',
            private_key: '123',
            host: 'app.getsentry.com',
            path: '',
            project_id: 1,
            port: 0
        };
        process.env.SENTRY_DSN='https://abc:123@app.getsentry.com/1';
        var client = new raven.Client();
        client.dsn.should.eql(expected);
        delete process.env.SENTRY_DSN; // gotta clean up so it doesn't leak into other tests
    });

    it('should pull SENTRY_DSN from environment when passing options', function(){
        var expected = {
            protocol: 'https',
            public_key: 'abc',
            private_key: '123',
            host: 'app.getsentry.com',
            path: '',
            project_id: 1,
            port: 0
        };
        process.env.SENTRY_DSN='https://abc:123@app.getsentry.com/1';

        var client = new raven.Client({name: 'YAY!'});
        client.dsn.should.eql(expected);
        client.name.should.equal('YAY!');
        delete process.env.SENTRY_DSN; // gotta clean up so it doesn't leak into other tests
    });

    it('should be disabled when no DSN specified', function(){
        mockConsoleWarn();
        var client = new raven.Client();
        client._enabled.should.eql(false);
        console.warn._called.should.eql(false);
        restoreConsoleWarn();
    });

    it('should pull SENTRY_NAME from environment', function(){
        process.env.SENTRY_NAME='new_name';
        var client = new raven.Client(dsn);
        client.name.should.eql('new_name');
        delete process.env.SENTRY_NAME;
    });

    it('should be disabled for a falsey DSN', function(){
        mockConsoleWarn();
        var client = new raven.Client(false);
        client._enabled.should.eql(false);
        console.warn._called.should.eql(false);
        restoreConsoleWarn();
    });

    it('show throw an Error on invalid transport protocol', function(){
      (function(){
        raven.Client('noop://8769c40cf49c4cc58b51fa45d8e2d166:296768aa91084e17b5ac02d3ad5bc7e7@mysentry.com:1234/some/other/path/269');
      }).should.throw();
    });

    describe('#getIdent()', function(){
        it('should match', function(){
            var result = {
                id: 'c988bf5cb7db4653825c92f6864e7206'
            };
            client.getIdent(result).should.equal('c988bf5cb7db4653825c92f6864e7206');
        });
    });

    describe('#captureMessage()', function(){
        it('should send a plain text message to Sentry server', function(done){
            var scope = nock('https://app.getsentry.com')
                .filteringRequestBody(/.*/, '*')
                .post('/api/store/', '*')
                .reply(200, 'OK');

            client.on('logged', function(){
                scope.done();
                done();
            });
            client.captureMessage('Hey!');
        });

        it('should emit error when request returns non 200', function(done){
            var scope = nock('https://app.getsentry.com')
                .filteringRequestBody(/.*/, '*')
                .post('/api/store/', '*')
                .reply(500, 'Oops!');

            client.on('error', function(){
                scope.done();
                done();
            });
            client.captureMessage('Hey!');
        });
    });

    describe('#captureError()', function(){
        it('should send an Error to Sentry server', function(done){
            var scope = nock('https://app.getsentry.com')
                .filteringRequestBody(/.*/, '*')
                .post('/api/store/', '*')
                .reply(200, 'OK');

            client.on('logged', function(){
                scope.done();
                done();
            });
            client.captureError(new Error('wtf?'));
        });

        it('should send an Error to Sentry server on another port', function(done){
            var scope = nock('https://app.getsentry.com:8443')
                .filteringRequestBody(/.*/, '*')
                .post('/api/store/', '*')
                .reply(200, 'OK');

            var dsn = 'https://public:private@app.getsentry.com:8443/269';
            var client = new raven.Client(dsn);
            client.on('logged', function(){
                scope.done();
                done();
            });
            client.captureError(new Error('wtf?'));
        });

        it('should send an Error to Sentry server over UDP', function(done){
            var scope = mockudp('app.getsentry.com:1234');

            var dsn = 'udp://public:private@app.getsentry.com:1234/269';
            var client = new raven.Client(dsn);
            client.on('logged', function(){
                scope.done();
                done();
            });
            client.captureError(new Error('wtf?'));
        });

        it('should capture module information', function(done) {
            var scope = nock('https://app.getsentry.com')
                .filteringRequestBody(function(body) {
                    var buff = new Buffer(body, 'base64');
                    zlib.inflate(buff, function(err, dec) {
                        assert.ifError(err);
                        var msg = JSON.parse(dec.toString());
                        var modules = msg.modules;

                        assert.equal(modules.raven, raven.version);
                        done();
                    });
                    return '*';
                })
                .post('/api/store/', '*')
                .reply(200, 'OK');

            client.on('logged', function(){
                scope.done();
            });
            client.captureError(new Error('wtf?'));
        });
    });
});
