var path = require('path');
const oracledb = require('oracledb');
const dbConfig = require('../common/config-database');
var logger = require('./../common/logging/winston')(path.join(process.cwd(),'/services/database.js')); //((__filename);

var pool = null;
async function initialize() {
  return await oracledb.createPool(dbConfig.hrPool);
}

async function close() {
  await oracledb.getPool().close();
}

initialize()
.then( conns => {
  pool = conns; 
}) 
.catch( err => {
  logger.info(err.message);
})

module.exports = {pool ,close};