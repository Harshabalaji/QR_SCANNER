const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConn() {
  const pw = process.env.DB_PASSWORD || 'Rahul@143';
  console.log(`Testing connection with DB_USER="${process.env.DB_USER || 'root'}" and password from .env...`);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: pw,
    });
    console.log(`\n🎉 SUCCESS! Connected to MySQL on port ${process.env.DB_PORT || 3306}!`);
    
    const [dbs] = await connection.query('SHOW DATABASES');
    console.log('Databases:', dbs.map(d => d.Database));

    try {
      await connection.query('USE np_branding');
      console.log('Successfully switched to database: np_branding');
      const [tables] = await connection.query('SHOW TABLES');
      console.log('\nTables in np_branding:', tables.map(t => Object.values(t)[0]));
      for (const t of tables) {
        const tableName = Object.values(t)[0];
        const [cols] = await connection.query(`DESCRIBE \`${tableName}\``);
        console.log(`\n--- Schema for ${tableName} ---`);
        cols.forEach(c => console.log(`  ${c.Field} (${c.Type}) | Null:${c.Null} | Key:${c.Key} | Default:${c.Default}`));
        const [rows] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        console.log(`  Row count: ${rows[0].count}`);
      }
    } catch (err) {
      console.log('Error inspecting np_branding:', err.message);
    }
    await connection.end();
  } catch (e) {
    console.log(`Connection failed: ${e.message}`);
  }
}

testConn();
