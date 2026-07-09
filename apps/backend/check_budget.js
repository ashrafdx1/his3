const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'his_secure_password_2026',
  database: process.env.DB_DATABASE || 'his_db',
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT * FROM budget');
  console.log('BUDGET:', res.rows);
  
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema='public'
  `);
  console.log('TABLES:', tables.rows.map(t => t.table_name));

  await client.end();
}

main().catch(console.error);
