var path = require('path');
const oracledb = require('oracledb');
const dbConfig = require('../common/config-database');
var logger = require('./../common/logging/winston')(path.join(process.cwd(),'/services/database.js')); //((__filename);

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
/*
async function sleep(fn, ...args) {
  await timeout(3000);
  return fn(...args);
}*/

async function initialize() {
  logger.info(dbConfig.hrPool);
  try{
    return await oracledb.createPool(dbConfig.hrPool);
  }catch(ex){
    logger.info('Could not connect oracle server : '+ex.message);
    await timeout(60000);
    initialize();
  }
  //return await oracledb.createPool(dbConfig.hrPool);
}

async function close() {
  await oracledb.getPool().close();
}

/*
initialize()
.then( conns => {
  console.log('initialize pool => done');
  pool = conns; 
}) 
.catch( err => {
  logger.info(err.message);
  logger.info(err);
})
*/

module.exports = {initialize,close};