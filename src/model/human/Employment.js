require('dotenv').config({ path: '../../../.env' })
const { sequelize_sqlserver } = require('../../config/Sequelize');
const { Sequelize, Model, DataTypes } = require('sequelize');
const Job_History = require('./Job_History');
const Personal = require('./Personal');

const Employment = sequelize_sqlserver.define('EMPLOYMENT', {
    EMPLOYMENT_ID: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    EMPLOYMENT_CODE: DataTypes.STRING,
    EMPLOYMENT_STATUS: DataTypes.CHAR,
    HIRE_DATE_FOR_WORKING: DataTypes.DATE,
    WORKERS_COMP_CODE: DataTypes.CHAR,
    TERMINATION_DATE: DataTypes.DATE,
    REHIRE_DATE_FOR_WORKING: DataTypes.DATE,
    LAST_REVIEW_DATE: DataTypes.DATE,
    NUMBER_DAYS_REQUIREMENT_OF_WORKING_PER_MONTH: DataTypes.INTEGER,
    PERSONAL_ID: DataTypes.INTEGER
}, { sequelize_sqlserver, modelName: 'EMPLOYMENT', tableName: 'EMPLOYMENT' });


module.exports = Employment;