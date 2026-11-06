const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '011_room_checklist_templates.sql'), 'utf8');
  await pool.query(sql);
  console.log('Room checklist templates migration applied successfully.');
}

main().catch(error => {
  console.error('Room checklist templates migration failed:', error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
