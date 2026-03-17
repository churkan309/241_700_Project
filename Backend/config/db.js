const mysql = require('mysql2/promise');

let db = null;

const connectDB = async () => {
    db = await mysql.createConnection({
        host:     process.env.DB_HOST,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port:     Number(process.env.DB_PORT),
    });
    console.log('Connected to database');
};

const getDB = () => db;

module.exports = { connectDB, getDB };
