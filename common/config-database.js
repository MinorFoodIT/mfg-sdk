var hrPool = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTIONSTRING,
    poolMin: process.env.ORACLE_POOL_MIN,
    poolMax: process.env.ORACLE_POOL_MAX,
    poolIncrement: 1
  }

  module.exports = {"hrPool" : hrPool}