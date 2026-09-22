const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { encryptText, decryptText, isEncrypted } = require('./fieldEncryption');

test('AES-256-GCM encrypts reversibly with a fresh nonce', () => {
  const key = crypto.randomBytes(32).toString('base64');
  const first = encryptText('sensitive-file-data', key);
  const second = encryptText('sensitive-file-data', key);
  assert.equal(isEncrypted(first), true);
  assert.notEqual(first, second);
  assert.equal(decryptText(first, key), 'sensitive-file-data');
  assert.equal(decryptText(second, key), 'sensitive-file-data');
});

test('AES-GCM rejects altered ciphertext and supports legacy plaintext reads', () => {
  const key = crypto.randomBytes(32).toString('base64');
  const encrypted = encryptText('profile-image', key);
  const altered = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`;
  assert.throws(() => decryptText(altered, key));
  assert.equal(decryptText('legacy-data-uri', key), 'legacy-data-uri');
});
