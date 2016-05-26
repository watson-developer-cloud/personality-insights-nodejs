#! /usr/bin/env node
'use strict';

require('dotenv').config({silent: true});

var logger  = require('winston'),
    port    = require('./config/app-info').port;

// Deployment tracking
require('cf-deployment-tracker-client').track();

var server = require('./app');
var port = process.env.PORT || process.env.VCAP_APP_PORT || port;

server.listen(port, function () {
  logger.info('Listening at:', port);
});
