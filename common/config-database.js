const config = require('./config');


var hrPool = {
    user: config.ORACLE_USER,
    password: config.ORACLE_PASSWORD,
    connectString: config.ORACLE_CONNECTIONSTRING,
    poolMin: Number(config.ORACLE_POOL_MIN),
    poolMax: Number(config.ORACLE_POOL_MAX),
    poolIncrement: 0
  }

  module.exports = {"hrPool" : hrPool}