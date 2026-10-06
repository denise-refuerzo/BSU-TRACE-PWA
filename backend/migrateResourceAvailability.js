const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '003_resource_availability.sql'), 'utf8');
  await pool.query(sql);
  console.log('Resource availability migration applied successfully.');
}

main()
  .catch(error => {
    console.error('Resource availability migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
