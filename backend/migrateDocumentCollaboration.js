const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

(async () => {
  try {
    const sql = await fs.readFile(path.join(__dirname, 'migrations', '009_document_collaboration.sql'), 'utf8');
    await pool.query(sql);
    console.log('Document collaboration, archive, cancellation, and activity history migration applied successfully.');
  } catch (error) {
    console.error('Document collaboration migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
