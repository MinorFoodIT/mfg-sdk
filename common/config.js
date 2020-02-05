const Joi = require('joi');

// require and configure dotenv, will load vars in .env to in PROCESS.ENV
require('dotenv').config({silent: true});
//console.info(process.env)

// define validation for all the env vars
const envVarsSchema = Joi.object({
    NODE_ENV: Joi.string()
        .allow(['development', 'production', 'test', 'provision'])
        .default('development'),
    PORT: Joi.number()
        .default(4000),
    // MONGOOSE_DEBUG: Joi.boolean()
    //     .when('NODE_ENV', {
    //         is: Joi.string().equal('development'),
    //         then: Joi.boolean().default(true),
    //         otherwise: Joi.boolean().default(false)
    //     }),
    // JWT_SECRET: Joi.string().required()
    //     .description('JWT Secret required to sign')
}).unknown()
    .required();

//Validate
const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
    throw new Error(`Config environment validation error: ${error.message}`);
}

const config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
   
    ORACLE_USER: envVars.ORACLE_USER,
    ORACLE_PASSWORD: envVars.ORACLE_PASSWORD,
    ORACLE_CONNECTIONSTRING: envVars.ORACLE_CONNECTIONSTRING,
    ORACLE_POOL_MIN: envVars.ORACLE_POOL_MIN,
    ORACLE_POOL_MAX: envVars.ORACLE_POOL_MAX,
}

module.exports = config;