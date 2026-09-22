const pool = require('./db');
const {encryptText, isEncrypted, parseKey} = require('./security/fieldEncryption');

async function main() {
  parseKey();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT u_id,profile_pic FROM public."User" WHERE profile_pic IS NOT NULL FOR UPDATE');
    let migrated = 0;
    for (const row of result.rows) {
      if (isEncrypted(row.profile_pic)) continue;
      await client.query('UPDATE public."User" SET profile_pic=$1 WHERE u_id=$2', [encryptText(row.profile_pic), row.u_id]);
      migrated += 1;
    }
    await client.query('COMMIT');
    console.log(`Encrypted ${migrated} existing profile picture(s).`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch(error => {
    console.error('File encryption migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
