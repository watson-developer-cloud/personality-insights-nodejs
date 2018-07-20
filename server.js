#! /usr/bin/env node

require('dotenv').config({ silent: true });

const server = require('./app');
const port = process.env.PORT || 3000;

server.listen(port, () =>
  // eslint-disable-next-line
  console.log('Listening at:', port)
);
