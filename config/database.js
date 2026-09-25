// config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const isLocal = (process.env.DATABASE_URL || '').includes('localhost');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL database:', err);
        return;
    }
    console.log('Connected to PostgreSQL database');
    release();
});

module.exports = pool;