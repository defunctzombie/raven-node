// sentry.interfaces.Exception

module.exports = function(err) {
    return {
        type: err.name,
        value: err.message
    };
};

module.exports.key = 'sentry.interfaces.Exception';

