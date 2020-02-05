const config = require('./config');


var hrPool = {
    user: config.ORACLE_USER,
    password: config.ORACLE_PASSWORD,
    connectString: config.ORACLE_CONNECTIONSTRING,
    poolMin: config.ORACLE_POOL_MIN,
    poolMax: config.ORACLE_POOL_MAX,
    poolIncrement: 1
  }

  module.exports = {"hrPool" : hrPool}