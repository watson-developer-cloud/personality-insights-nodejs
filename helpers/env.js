/**
 * When running this app on a local machine, this script
 * checks for environment variables defined in .env.js
 */

try {
  var env = require('../.env.js');
  console.log('loading .env.js');
  for (var key in env) {
    if (!(key in process.env))
      process.env[key] = env[key];
  }
} catch(ex) {
  console.log('.env.js not found');
}
