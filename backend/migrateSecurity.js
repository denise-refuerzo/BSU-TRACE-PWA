const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

async function main() {
  const sql = await fs.readFile(path.join(__dirname, 'migrations', '001_public_ids.sql'), 'utf8');
  await pool.query(sql);
  console.log('Security identifier migration applied successfully.');
}

main()
  .catch(error => {
    console.error('Security identifier migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
