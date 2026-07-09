const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'his_secure_password_2026',
  database: process.env.DB_DATABASE || 'his_db',
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'message_request'
  `);
  console.log('Columns of message_request:', res.rows);
  const rowsRes = await client.query(`SELECT * FROM message_request`);
  console.log('Rows in message_request:', rowsRes.rows);
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
