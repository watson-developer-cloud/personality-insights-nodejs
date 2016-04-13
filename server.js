#! /usr/bin/env node
'use strict';

var logger  = require('winston'),
    port    = require('./config/app-info').port;

if (process.env.GOOGLE_ANALYTICS) {
  process.env.GOOGLE_ANALYTICS = process.env.GOOGLE_ANALYTICS.replace(/\"/g,'');
}

// Deployment tracking
require('cf-deployment-tracker-client').track();

var server = require('./app');
var port = process.env.PORT || process.env.VCAP_APP_PORT || port;

server.listen(port, function () {
  logger.info('Listening at:', port);
});
