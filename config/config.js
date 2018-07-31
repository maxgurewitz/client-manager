module.exports = {
  development: {
    username: 'postgres',
    password: null,
    database: 'client_manager_development',
    host: '127.0.0.1',
    operatorsAliases: false,
    dialect: 'postgres'
  },
  test: {
    username: 'postgres',
    password: null,
    database: 'client_manager_development',
    host: '127.0.0.1',
    operatorsAliases: false,
    dialect: 'postgres'
  },
  production: {
    // username: 'postgres',
    // password: null,
    // database: 'client_manager_production',
    // host: process.env.DATABASE_URL.split(' ')[0],
    use_env_variable: 'DATABASE_URL',
    operatorsAliases: false,
    dialect: 'postgres'
  }
};
