const fs = require('node:fs/promises');
const path = require('node:path');
const pool = require('./db');

(async () => {
  try {
    const migrations = ['004_account_access.sql', '005_allow_legacy_emails.sql', '006_multiple_signatories.sql', '007_session_expiry.sql'];
    for (const filename of migrations) {
      const sql = await fs.readFile(path.join(__dirname, 'migrations', filename), 'utf8');
      await pool.query(sql);
    }
    console.log('Account access, signatory, legacy email, and session migrations applied successfully.');
  } catch (error) {
    console.error('Account access migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
