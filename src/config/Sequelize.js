require('dotenv').config({ path: '../../.env' });
const { Sequelize } = require('sequelize');

//config of mysql
const MYSQL_NAME = process.env.DATABASE_MYSQL;
const MYSQL_USER = process.env.USER_MYSQL;
const MYSQL_PASSWORD = process.env.PASSWORD_MYSQL;
const MYSQL_HOST = process.env.HOST_MYSQL;
const MYSQL_PORT = process.env.PORT_MYSQL;

//config of sql server
const SQLSERVER_NAME = process.env.DATABASE_SQLSERVER;
const SQLSERVER_USER = process.env.USER_SQLSERVER;
const SQLSERVER_PASSWORD = process.env.PASSWORD_SQLSERVER;
const SQLSERVER_HOST = process.env.HOST_SQLSERVER;
const SQLSERVER_PORT = process.env.PORT_SQLSERVER;
const SQL_SERVER_NAME_USER = process.env.DATABASE_SQLSERVER_USER;

const sequelize_mysql = new Sequelize(MYSQL_NAME, MYSQL_USER, MYSQL_PASSWORD, {
    host: MYSQL_HOST,
    dialect: 'mysql',
    port: Number(MYSQL_PORT),
    define: {
        timestamps: false
    }
});

const sequelize_sqlserver = new Sequelize(SQLSERVER_NAME, SQLSERVER_USER, SQLSERVER_PASSWORD, {
    host: SQLSERVER_HOST,
    dialect: 'mssql',
    port: Number(SQLSERVER_PORT),
    define: {
        timestamps: false
    }
});

const sequelize_sqlserver_user = new Sequelize(SQL_SERVER_NAME_USER,SQLSERVER_USER,SQLSERVER_PASSWORD,{
    host: SQLSERVER_HOST,
    dialect: 'mssql',
    port: Number(SQLSERVER_PORT),
    define:{
        timestamps: false
    }
})

module.exports = { sequelize_mysql, sequelize_sqlserver, sequelize_sqlserver_user }