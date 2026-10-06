const crypto = require('node:crypto');

const PREFIX = 'enc:v1';

function parseKey(value = process.env.FILE_ENCRYPTION_KEY) {
  if (!value) throw new Error('FILE_ENCRYPTION_KEY is required to store encrypted files.');
  const key = /^[a-f\d]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('FILE_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return key;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(`${PREFIX}:`);
}

function encryptText(plaintext, keyValue) {
  if (plaintext == null || plaintext === '') return plaintext;
  if (isEncrypted(plaintext)) return plaintext;
  const key = parseKey(keyValue);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
}

function decryptText(value, keyValue) {
  if (value == null || value === '' || !isEncrypted(value)) return value;
  const parts = value.split(':');
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== PREFIX) throw new Error('Encrypted value has an invalid envelope.');
  const key = parseKey(keyValue);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[2], 'base64url'));
  decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[4], 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

function generateKey() {
  return crypto.randomBytes(32).toString('base64');
}

module.exports = { encryptText, decryptText, isEncrypted, generateKey, parseKey };
