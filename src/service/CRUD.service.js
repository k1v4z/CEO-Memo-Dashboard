const { QueryTypes, where } = require("sequelize");
const { sequelize_sqlserver, sequelize_mysql } = require("../config/Sequelize");
const { convertShareHolder, generateEmployeeCode, generatePersonalId, generateEmploymentId, generateEmployeeId, convert_SSN, typeCastingZIP } = require("../helper/Add_Employee.helper");
const defineAssociation = require("../model/association/Association");
const Job_History = require("../model/human/Job_History");
const Personal = require("../model/human/Personal");
const Employment = require("../model/human/Employment");
const { formatDate, getCurrentDateTime } = require("../helper/FormatDate");
const Benefit_Plans = require("../model/human/Benefit_Plans");
const path = require('path');
const { writeJSONFile, readJSONFile } = require("../helper/HandleJSON");
const Employee = require("../model/payroll/Employees");
defineAssociation();
let oldBenefitPlanID;

const setOldBenefitPlanID = (id) => {
    oldBenefitPlanID = id;
}

const getOldBenefitPlanID = () => {
    return oldBenefitPlanID;
}


const getAllDepartment = async () => {
    const department = await Job_History.findAll({
        attributes: [sequelize_sqlserver.fn('DISTINCT', sequelize_sqlserver.col('DEPARTMENT')), 'DEPARTMENT']
    }).then(res => JSON.stringify(res))
        .then(JSON_String => JSON.parse(JSON_String));

    return department;
}

const getAllEthnicity = async () => {
    const ethnicity = await Personal.findAll({
        attributes: [sequelize_sqlserver.fn('DISTINCT', sequelize_sqlserver.col('ETHNICITY')), 'ETHNICITY']
    }).then(res => JSON.stringify(res))
        .then(JSON_String => JSON.parse(JSON_String));

    return ethnicity;
}
const getAllPersonalInfomations = async () => {
    const data = await Personal.findAll().then(res => JSON.stringify(res))
        .then(StringJSON => JSON.parse(StringJSON))
        .catch(err => console.log(err));
    return data;
}

const getEmployeeInfor = async () => {
    const dataEmployment = await Employment.findAll({
        include: [{
            model: Personal,
            required: true, // Inner join
        }]
    })

    let ids = dataEmployment.map(Employment => Employment.EMPLOYMENT_ID);
    console.log(ids);

    const dataEmployee = await sequelize_mysql.query(
        `SELECT * FROM mydb.employee 
            WHERE idEmployee IN (${ids.join(',')})`,
        { type: QueryTypes.SELECT }
    );

    const Data = dataEmployment.map(employment => {
        const employee = dataEmployee.find(Employee => Employee['Employee Number'] === employment.EMPLOYMENT_CODE);
        //if have key duplicated, employee value will overwrite value from employment.toJSON
        return { ...employment.toJSON(), ...employee };
    });

    return Data;
}

const getEmployeeCode = async (id) => {
    const codeEmployee = await Employment.findOne({
        attributes: ['EMPLOYMENT_CODE'],
        where: { EMPLOYMENT_ID: Number(id) }
    }).then(res => res.toJSON())

    return codeEmployee.EMPLOYMENT_CODE;
}
const DeleteEmployeDelete = async (Id) => {
    const code = await getEmployeeCode(Id);
    console.log(code)

    sequelize_sqlserver.transaction(async (t) => {
        await sequelize_sqlserver.query(`
        DELETE FROM EMPLOYMENT_WORKING_TIME WHERE EMPLOYMENT_ID = ${Id};
        `, { type: QueryTypes.DELETE, transaction: t });

        // Delete information from the Employment Working Time table first to avoid errors
        await sequelize_sqlserver.query(`
        DELETE FROM JOB_HISTORY WHERE EMPLOYMENT_ID  = ${Id};
        `, { type: QueryTypes.DELETE, transaction: t });

        // Delete information from the Employment table
        await sequelize_sqlserver.query(`
            DELETE FROM EMPLOYMENT WHERE EMPLOYMENT_ID = ${Id};
        `, { type: QueryTypes.DELETE, transaction: t });
        // Delete employee

    }).then(res => console.log(res))
        .catch(err => console.log(err));

    await sequelize_mysql.query(
        `DELETE FROM employee WHERE \`Employee Number\` = '${code}';`,
        { type: QueryTypes.DELETE }
    ).catch(err => console.log(err));
}

const deletePersonalAndEmployment = async (Id) => {
    try {
        await sequelize_sqlserver.transaction(async (t) => {
            // Delete information from the Employment, Job History, and Employment Working Time tables
            await sequelize_sqlserver.query(`
                DELETE FROM EMPLOYMENT_WORKING_TIME WHERE EMPLOYMENT_ID IN (SELECT EMPLOYMENT_ID FROM EMPLOYMENT WHERE PERSONAL_ID = ${Id});
                `, { transaction: t });

            // Delete information from the Employment Working Time table first to avoid errors
            await sequelize_sqlserver.query(`
                DELETE FROM JOB_HISTORY WHERE EMPLOYMENT_ID IN (SELECT EMPLOYMENT_ID FROM EMPLOYMENT WHERE PERSONAL_ID = ${Id});
                `, { transaction: t });

            // Delete information from the Employment table
            await sequelize_sqlserver.query(`
                    DELETE FROM EMPLOYMENT WHERE PERSONAL_ID = ${Id};
                `, { transaction: t });

            // Delete information from the Personal table
            await sequelize_sqlserver.query(`
                    DELETE FROM PERSONAL WHERE PERSONAL_ID = ${Id};
                `, { transaction: t });
        }
        );

        // Delete information from the Employee table

    } catch (error) {
        console.error('Lỗi khi xóa thông tin Personal và Employment:', error);
    }
}


//add Employee Personal Information
const add_EP_Information = async (req) => {
    //data is information of personal 
    const data = req.body;

    let message = ''
    if (data.employee_showInfo == 'on') {
        message = await addEmployee(data)
        return message
    } else {
        message = await addPersonal(data)
        return message
    }

}

const addPersonal = async (data) => {
    const PERSONAL_ID = await generatePersonalId()
    const SHAREHOLDER_STATUS_CONVERTED = convertShareHolder()
    data.CURRENT_ZIP = typeCastingZIP(data.CURRENT_ZIP)
    let message = ''

    await Personal.create({
        PERSONAL_ID: PERSONAL_ID,
        CURRENT_FIRST_NAME: data.CURRENT_FIRST_NAME,
        CURRENT_LAST_NAME: data.CURRENT_LAST_NAME,
        CURRENT_MIDDLE_NAME: data.CURRENT_MIDDLE_NAME,
        BIRTH_DATE: data.BIRTH_DATE,
        SOCIAL_SECURITY_NUMBER: data.SOCIAL_SECURITY_NUMBER,
        DRIVERS_LICENSE: data.DRIVERS_LICENSE,
        CURRENT_ADDRESS_1: data.CURRENT_ADDRESS_1,
        CURRENT_ADDRESS_2: data.CURRENT_ADDRESS_2,
        CURRENT_CITY: data.CURRENT_CITY,
        CURRENT_COUNTRY: data.CURRENT_COUNTRY,
        CURRENT_ZIP: data.CURRENT_ZIP,
        CURRENT_GENDER: data.CURRENT_GENDER,
        CURRENT_PHONE_NUMBER: data.CURRENT_PHONE_NUMBER,
        CURRENT_PERSONAL_EMAIL: data.CURRENT_PERSONAL_EMAIL,
        CURRENT_MARITAL_STATUS: data.CURRENT_MARITAL_STATUS,
        ETHNICITY: data.ETHNICITY,
        SHAREHOLDER_STATUS: SHAREHOLDER_STATUS_CONVERTED,
        BENEFIT_PLAN_ID: data.BENEFIT_PLAN_ID
    }).then(res => message = 'Create Successful')
        .catch((err) => {
            console.log('sqlserver: ->>>>>>>>>>>', err);
            return message = 'Create Fail'
        })
    return message
}

const addEmployee = async (data) => {
    const SHAREHOLDER_STATUS_CONVERTED = convertShareHolder(data.SHAREHOLDER_STATUS) //data after convert
    const PERSONAL_ID = await generatePersonalId()
    const employmentId = await generateEmploymentId()
    const employeeCode = await generateEmployeeCode()
    const employeeId = await generateEmployeeId()
    const SSN_Converted = convert_SSN(data.SOCIAL_SECURITY_NUMBER)
    data.CURRENT_ZIP = typeCastingZIP(data.CURRENT_ZIP)
    let message = ''

    //add personal
    sequelize_sqlserver.transaction(async (t) => {
        const personal = await Personal.create({
            PERSONAL_ID: PERSONAL_ID,
            CURRENT_FIRST_NAME: data.CURRENT_FIRST_NAME,
            CURRENT_LAST_NAME: data.CURRENT_LAST_NAME,
            CURRENT_MIDDLE_NAME: data.CURRENT_MIDDLE_NAME,
            BIRTH_DATE: data.BIRTH_DATE,
            SOCIAL_SECURITY_NUMBER: data.SOCIAL_SECURITY_NUMBER,
            DRIVERS_LICENSE: data.DRIVERS_LICENSE,
            CURRENT_ADDRESS_1: data.CURRENT_ADDRESS_1,
            CURRENT_ADDRESS_2: data.CURRENT_ADDRESS_2,
            CURRENT_CITY: data.CURRENT_CITY,
            CURRENT_COUNTRY: data.CURRENT_COUNTRY,
            CURRENT_ZIP: data.CURRENT_ZIP,
            CURRENT_GENDER: data.CURRENT_GENDER,
            CURRENT_PHONE_NUMBER: data.CURRENT_PHONE_NUMBER,
            CURRENT_PERSONAL_EMAIL: data.CURRENT_PERSONAL_EMAIL,
            CURRENT_MARITAL_STATUS: data.CURRENT_MARITAL_STATUS,
            ETHNICITY: data.ETHNICITY,
            SHAREHOLDER_STATUS: SHAREHOLDER_STATUS_CONVERTED,
            BENEFIT_PLAN_ID: data.BENEFIT_PLAN_ID
        }, { transaction: t })

        await Employment.create({
            EMPLOYMENT_ID: employmentId,
            EMPLOYMENT_CODE: employeeCode,
            EMPLOYMENT_STATUS: data.EMPLOYMENT_STATUS,
            HIRE_DATE_FOR_WORKING: data.HIRE_DATE,
            WORKERS_COMP_CODE: data.WORKERS_COMP_CODE,
            TERMINATION_DATE: data.TERMINATION_DATE,
            REHIRE_DATE_FOR_WORKING: data.REHIRE_DATE_FOR_WORKING,
            LAST_REVIEW_DATE: data.LAST_REVIEW_DATE,
            NUMBER_DAYS_REQUIREMENT_OF_WORKING_PER_MONTH: data.NUMBER_DAY_REQUIREMENT,
            PERSONAL_ID: personal.PERSONAL_ID
        }, { transaction: t })

    }).then(res => message = 'Create Successful')
        .catch((err) => {
            console.log('sqlserver: ->>>>>>>>>>>', err);
            return message = 'Create Fail'
        })

    if (message == 'Create Fail')
        return message

    //add employee
    await sequelize_mysql.query(
        `INSERT INTO mydb.employee(\`idEmployee\`,\`Employee Number\`,\`First Name\`,
                \`Last Name\`,\`SSN\`,\`Pay Rate\`,\`Pay Rates_idPay Rates\`,
                \`Vacation Days\`,\`Paid To Date\`,\`Paid Last Year\`
            ) VALUES (${employeeId},'${employeeCode}','${data.CURRENT_FIRST_NAME}','${data.CURRENT_LAST_NAME}',${SSN_Converted},'${data.PAY_RATE}',${data.ID_PAY_RATE},${data.VACATION_DAYS},${data.PAID_TO_DATE},${data.PAID_LAST_YEAR});`,
        { type: QueryTypes.INSERT }
    ).then(res => message = 'Create Successful')
        .catch((err) => {
            console.log('mysql: ->>>>>>>>>>>', err);
            return message = 'Create Fail'
        })

    return message;
}

const getPersonalById = async (id) => {
    const PersonalByID = await Personal.findOne({
        where: {
            PERSONAL_ID: id
        }
    }).then(res => JSON.stringify(res))
        .then(StringJSON => JSON.parse(StringJSON))
        .catch(err => console.log(err));

    return PersonalByID;
}


const getDataPersonalByPage = async (data) => {
    const dataPersonal = {
        id_personal: data.PERSONAL_ID,
        first_name: data.CURRENT_FIRST_NAME,
        middle_name: data.CURRENT_MIDDLE_NAME,
        last_name: data.CURRENT_LAST_NAME,
        birth_date: data.BIRTH_DATE,
        address_1: data.CURRENT_ADDRESS_1,
        address_2: data.CURRENT_ADDRESS_2,
        current_zip: data.CURRENT_ZIP,
        gender: data.CURRENT_GENDER,
        mail: data.CURRENT_PERSONAL_EMAIL,
        Social_security_number: data.SOCIAL_SECURITY_NUMBER,
        drivers_license: data.DRIVERS_LICENSE,
        city: data.CURRENT_CITY,
        country: data.CURRENT_COUNTRY,
        phone_number: data.CURRENT_PHONE_NUMBER,
        marital_status: data.CURRENT_MARITAL_STATUS,
        shareholder_status: data.SHAREHOLDER_STATUS,
        ethnicity: data.ETHNICITY,
        benefit_plan_id: data.BENEFIT_PLAN_ID
    };
    return dataPersonal;
}

const getDataEmploymentByPage = async (data) => {
    const dataEmployment = {
        hire_date_working: data.HIRE_DATE_FOR_WORKING,
        employment_code: data.EMPLOYMENT_CODE,
        termination_date: data.TERMINATION_DATE,
        workers_comp_code: data.WORKERS_COMP_CODE,
        rehire_date_working: data.REHIRE_DATE_FOR_WORKING,
        last_review_date: data.LAST_REVIEW_DATE,
        employment_status: data.EMPLOYMENT_STATUS,
        pay_rate: data.PAY_RATE,
        id_pay_rate: data.ID_PAY_RATE,
        vacation_days: data.VACATION_DAYS,
        paid_to_date: data.PAID_TO_DATE,
        paid_last_year: data.PAID_LAST_YEAR,
        number_days_requirement: data.NUMBER_DAY_REQUIREMENT
    };
    return dataEmployment;
}

const checkDifferenceData = (dataPersonal) => {
    let oldID = getOldBenefitPlanID();
    if (oldID != dataPersonal.benefit_plan_id) {
        const newData = {
            "name": dataPersonal.first_name,
            "gender": dataPersonal.gender,
            "benefit_plan_id": dataPersonal.benefit_plan_id,
            "date_created_at": getCurrentDateTime()
        }
        const filepath = path.join(__dirname, 'message.json');
        const oldMessages = readJSONFile(filepath);
        oldMessages.push(newData);
        writeJSONFile(filepath, oldMessages);
        console.log("======= ĐÃ THAY ĐỔI =======")
    } else {
        console.log("======= KHÔNG THAY ĐỔI =======")
    }

}

const handleUpdatePersonal = async (dataPersonal) => {

    try {
        await Personal.update({
            CURRENT_FIRST_NAME: dataPersonal.first_name,
            CURRENT_MIDDLE_NAME: dataPersonal.middle_name,
            CURRENT_LAST_NAME: dataPersonal.last_name,
            BIRTH_DATE: dataPersonal.birth_date,
            CURRENT_ADDRESS_1: dataPersonal.address_1,
            CURRENT_ADDRESS_2: dataPersonal.address_2,
            CURRENT_ZIP: dataPersonal.current_zip,
            CURRENT_GENDER: dataPersonal.gender,
            CURRENT_PERSONAL_EMAIL: dataPersonal.mail,
            SOCIAL_SECURITY_NUMBER: dataPersonal.Social_security_number,
            DRIVERS_LICENSE: dataPersonal.drivers_license,
            CURRENT_CITY: dataPersonal.city,
            CURRENT_COUNTRY: dataPersonal.country,
            CURRENT_PHONE_NUMBER: dataPersonal.phone_number,
            CURRENT_MARITAL_STATUS: dataPersonal.marital_status,
            SHAREHOLDER_STATUS: dataPersonal.shareholder_status === "Shareholder" ? 1 : 0,
            ETHNICITY: dataPersonal.ethnicity,
            BENEFIT_PLAN_ID: dataPersonal.benefit_plan_id
        }, {
            where: {
                PERSONAL_ID: dataPersonal.id_personal
            }
        });
        console.log("======= ĐANG GỌI ĐẾN CHECK DIFFERENCE DATA =======")
        checkDifferenceData(dataPersonal);
    } catch (err) {
        console.log('sqlserver: ->>>>>>>>>>>', err);
        return false; // Update failed
    }
}

const handleInsertEmployment = async (dataPersonal, dataEmployment) => {
    const employeeCode = await generateEmployeeCode()
    const employeeId = await generateEmployeeId()
    const employmentId = await generateEmploymentId()
    try {
        if (dataEmployment.hire_date_working != undefined) {
            await Employment.create({
                EMPLOYMENT_ID: employmentId,
                EMPLOYMENT_CODE: employeeCode,
                EMPLOYMENT_STATUS: dataEmployment.employment_status,
                HIRE_DATE_FOR_WORKING: formatDate(dataEmployment.hire_date_working),
                WORKERS_COMP_CODE: dataEmployment.workers_comp_code,
                TERMINATION_DATE: formatDate(dataEmployment.termination_date),
                REHIRE_DATE_FOR_WORKING: formatDate(dataEmployment.rehire_date_working),
                LAST_REVIEW_DATE: formatDate(dataEmployment.last_review_date),
                NUMBER_DAYS_REQUIREMENT_OF_WORKING_PER_MONTH: dataEmployment.number_days_requirement,
                PERSONAL_ID: dataPersonal.id_personal
            });
            console.log('MSSQL Create Successful');

            // Insert into MySQL database using parameterized queries
            const mysqlQuery = `
                    INSERT INTO mydb.employee(
                        \`idEmployee\`, \`Employee Number\`, \`First Name\`, 
                        \`Last Name\`, \`SSN\`, \`Pay Rate\`, \`Pay Rates_idPay Rates\`,
                        \`Vacation Days\`, \`Paid To Date\`, \`Paid Last Year\`
                    ) VALUES (
                        :employeeId, :employeeCode, :firstName, 
                        :lastName, :ssn, :payRate, :idPayRate, 
                        :vacationDays, :paidToDate, :paidLastYear
                    )`;
            await sequelize_mysql.query(mysqlQuery, {
                replacements: {
                    employeeId,
                    employeeCode,
                    firstName: dataPersonal.first_name,
                    lastName: dataPersonal.last_name,
                    ssn: convert_SSN(dataPersonal.Social_security_number),
                    payRate: dataEmployment.pay_rate,
                    idPayRate: dataEmployment.id_pay_rate,
                    vacationDays: dataEmployment.vacation_days,
                    paidToDate: dataEmployment.paid_to_date,
                    paidLastYear: dataEmployment.paid_last_year
                },
                type: QueryTypes.INSERT
            });
            console.log('MySQL Create Successful');
            return true;
        }
    } catch (error) {
        console.error('Error during employment creation:', error);
        return false;
    }
}

const handleUpdateEmployment = async (dataPersonal, dataEmployment) => {
    try {
        if (dataEmployment.pay_rate !== undefined) {
            const preprocessedDataMSSQL = {
                EMPLOYMENT_STATUS: dataEmployment.employment_status,
                HIRE_DATE_FOR_WORKING: formatDate(dataEmployment.hire_date_working),
                WORKERS_COMP_CODE: dataEmployment.workers_comp_code,
                TERMINATION_DATE: formatDate(dataEmployment.termination_date),
                REHIRE_DATE_FOR_WORKING: formatDate(dataEmployment.rehire_date_working),
                LAST_REVIEW_DATE: formatDate(dataEmployment.last_review_date),
                NUMBER_DAYS_REQUIREMENT_OF_WORKING_PER_MONTH: dataEmployment.number_days_requirement
            };

            const preprocessedDataMYSQL = {
                firstName: dataPersonal.first_name,
                lastName: dataPersonal.last_name,
                ssn: convert_SSN(dataPersonal.Social_security_number),
                payRate: dataEmployment.pay_rate,
                idPayRate: dataEmployment.id_pay_rate,
                vacationDays: dataEmployment.vacation_days,
                paidToDate: dataEmployment.paid_to_date,
                paidLastYear: dataEmployment.paid_last_year,
                employeeNumber: dataEmployment.employment_code
            };

            // SQL Server Update
            await Employment.update(preprocessedDataMSSQL, {
                where: { PERSONAL_ID: dataPersonal.id_personal }
            });

            // MySQL Update
            await sequelize_mysql.query(
                `UPDATE mydb.employee SET
                    \`First Name\`=:firstName,
                    \`Last Name\`=:lastName,
                    \`SSN\`=:ssn,
                    \`Pay Rate\`=:payRate,
                    \`Pay Rates_idPay Rates\`=:idPayRate,
                    \`Vacation Days\`=:vacationDays,
                    \`Paid To Date\`=:paidToDate,
                    \`Paid Last Year\`=:paidLastYear
                    WHERE \`Employee Number\`=:employeeNumber;`,
                { replacements: preprocessedDataMYSQL, type: QueryTypes.UPDATE }
            );

            return true; // Successful update
        }
    } catch (error) {
        console.error('Error during employment update:', error);
        return false; // Update failed
    }
}

const getBenefitPlanById = async (id) => {
    const benefitPlan = await Benefit_Plans.findOne({
        where: { BENEFIT_PLANS_ID: id }
    })
        .then(res => res.toJSON())
        .catch(err => console.log(err))

    return benefitPlan
}

const getAverageVacationDays = async () => {
    const data = await Employee.findAll();
    let vacationDays = 0, count = 0;
    data.forEach((item) => {
        vacationDays += item['Vacation Days'];
        count++;
    })
    return parseInt(vacationDays / count);
}


module.exports = {
    getAllDepartment,
    getAllEthnicity,
    getAllPersonalInfomations,
    add_EP_Information,
    getEmployeeInfor,
    getDataPersonalByPage,
    deletePersonalAndEmployment,
    getPersonalById,
    handleUpdateEmployment,
    handleUpdatePersonal,
    handleInsertEmployment,
    getDataEmploymentByPage,
    getBenefitPlanById,
    setOldBenefitPlanID,
    DeleteEmployeDelete,
    getAverageVacationDays
}