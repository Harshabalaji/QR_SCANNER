const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'np_branding',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Health check function verifying MySQL connection and correct database.
 */
async function checkDatabaseHealth() {
  try {
    const connection = await pool.getConnection();
    const [dbResult] = await connection.query('SELECT DATABASE() AS db_name');
    const currentDb = dbResult[0]?.db_name;

    // Check expected tables
    const [tablesResult] = await connection.query('SHOW TABLES');
    const tables = tablesResult.map(row => Object.values(row)[0]);

    connection.release();

    return {
      connected: true,
      database: currentDb,
      tables: tables,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Ensures schema tables exist in the connected database.
 */
async function initializeSchema() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) return;

    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const connection = await pool.getConnection();
    for (const statement of statements) {
      await connection.query(statement);
    }

    // Safe column migrations for existing tables
    const safeAlterQueries = [
      "ALTER TABLE products ADD COLUMN size VARCHAR(50) DEFAULT ''",
      "ALTER TABLE products ADD COLUMN color VARCHAR(50) DEFAULT ''",
      "ALTER TABLE products ADD COLUMN image TEXT",
      "ALTER TABLE sales ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00",
      "ALTER TABLE sales ADD COLUMN tax DECIMAL(10,2) DEFAULT 0.00",
      "ALTER TABLE sales ADD COLUMN cashier_id INT NULL",
      "ALTER TABLE sales ADD COLUMN cashier_name VARCHAR(255) NULL",
      "ALTER TABLE sales ADD COLUMN payment_status VARCHAR(50) DEFAULT 'paid'",
      "ALTER TABLE sales ADD COLUMN cash_received DECIMAL(10,2) NULL",
      "ALTER TABLE sales ADD COLUMN change_amount DECIMAL(10,2) NULL",
      "ALTER TABLE sale_items ADD COLUMN size VARCHAR(50) DEFAULT ''",
      "ALTER TABLE sale_items ADD COLUMN color VARCHAR(50) DEFAULT ''",
    ];

    for (const alterSql of safeAlterQueries) {
      try {
        await connection.query(alterSql);
      } catch (e) {
        // Ignore ER_DUP_FIELDNAME (1060) if column already exists
      }
    }

    // Seed default Manager and Cashier accounts if users table is empty
    const bcrypt = require('bcryptjs');
    const [userRows] = await connection.query('SELECT COUNT(*) AS cnt FROM users');
    if (userRows[0].cnt === 0) {
      const defaultPinHash = bcrypt.hashSync('1234', 10);
      await connection.query(
        `INSERT INTO users (name, username, pin_hash, role, is_active) VALUES 
         (?, ?, ?, ?, ?),
         (?, ?, ?, ?, ?)`,
        [
          'Store Manager', 'manager', defaultPinHash, 'manager', 1,
          'Cashier 01', 'cashier01', defaultPinHash, 'cashier', 1,
        ]
      );
      console.log('[MySQL] Default users created: Manager (username: manager, PIN: 1234), Cashier (username: cashier01, PIN: 1234)');
    }

    connection.release();
    console.log('[MySQL] Schema initialized / verified successfully.');
  } catch (err) {
    console.warn('[MySQL] Schema initialization warning:', err.message);
  }
}

module.exports = {
  pool,
  checkDatabaseHealth,
  initializeSchema,
};
