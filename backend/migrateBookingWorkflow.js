const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '002_booking_workflow.sql'), 'utf8');
  await pool.query(sql);
  console.log('Booking workflow migration applied successfully.');
}

main()
  .catch(error => {
    console.error('Booking workflow migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
