#!/usr/bin/env node

/**
 * pkg
 * pkg -t node10-win-x64 --options max_old_space_size=6000 .
 */

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('http:api');
var http = require('http');
var logger = require('./../common/logging/winston')(__filename); //(path.join(process.cwd(),'/bin/server.js')) ; //

// console.log('>>');
// console.log(process.cwd());
// console.log(process.execPath);

/**
 * Get port from environment and store in Express.
 */

//var port = normalizePort(process.env.PORT || '4000');
//app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */
//server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

var tmplist = [];
setInterval(function(){
  // for(i=0 ;i<200000; i++){
  //   tmplist.push({"ok":"naka"});
  // }
  const used = process.memoryUsage();
  for (let key in used) {
    //console.log(`Memory: ${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
  //console.log('-------------');
  //console.log('Allocated memory since started '+JSON.stringify(mu));
},20000);


// *** line that requires services/web-server.js is here ***
const dbConfig = require('./../common/config-database');
const defaultThreadPoolSize = 4;

// Increase thread pool size by poolMax ,used by node-oracledb
process.env.UV_THREADPOOL_SIZE = dbConfig.hrPool.poolMax + defaultThreadPoolSize;
const {initialize,closeConn} = require('./../services/database.js');	


try {
  console.log('Initializing database module');
  initialize()
  .then(()=>{
    console.log('Initializing database module => done');
  }) 
  
} catch (err) {
  console.error(err);
  process.exit(1); // Non-zero failure code
}


/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  logger.info('[Server intrnal error] '+error)
  if (error.syscall !== 'listen') {
    //nodeCache.close();
    closeConn();
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      //nodeCache.close();
      closeConn();
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      //nodeCache.close();
      closeConn();
      process.exit(1);
      break;
    default:
      //nodeCache.close();
      closeConn();
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  logger.info('Listening on ' + bind);
  
}


