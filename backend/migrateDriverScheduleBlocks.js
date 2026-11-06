const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '010_driver_schedule_blocks.sql'), 'utf8');
  await pool.query(sql);
  console.log('Driver schedule blocks migration applied successfully.');
}

main().catch(error => {
  console.error('Driver schedule blocks migration failed:', error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
