# Raven [![Build Status](https://secure.travis-ci.org/mattrobenolt/raven-node.png?branch=master)](http://travis-ci.org/mattrobenolt/raven-node)
**Node v0.9 compatible**

Log errors and stack traces in [Sentry](http://getsentry.com/) from within your Node.js applications.

All processing and sending happens asynchronously to not slow things down if/when Sentry is down or slow.

## Compatibility
 * 0.6.x
 * 0.8.x
 * 0.9.x (latest unstable)

## Installation
```
$ npm install raven
```

## Basic Usage
```javascript
var raven = require('raven');
var client = new raven.Client('{{ SENTRY_DSN }}');

client.captureMessage('Hello, world!');
```

## Logging an error
```javascript
client.captureError(new Error('Broke!'));
```

## Sentry Identifier
```javascript
client.captureMessage('Hello, world!', function(result) {
    console.log(client.getIdent(result));
});
```

```javascript
client.captureError(new Error('Broke!'), function(result) {
  console.log(client.getIdent(result));
});
```

__Note__: `client.captureMessage` will also return the result directly without the need for a callback, such as: `var result = client.captureMessage('Hello, world!');`

## Events
If you really care if the event was logged or errored out, Client emits two events, `logged` and `error`:

```javascript
client.on('logged', function(){
  console.log('Yay, it worked!');
});
client.on('error', function(){
  console.log('oh well, Sentry is broke.');
})
client.captureMessage('Boom');
```

## Environment variables
### SENTRY_DSN
Optionally declare the DSN to use for the client through the environment. Initializing the client in your app won't require setting the DSN.

### SENTRY_NAME
Optionally set the name for the client to use. [What is name?](http://raven.readthedocs.org/en/latest/config/index.html#name)

## Methods
```javascript
new raven.Client(dsn[, options])
client.captureMessage(string[,callback])
client.captureError(Error[,callback])
```

## Support
You can find me on IRC. I troll in `#sentry` on `freenode`.
