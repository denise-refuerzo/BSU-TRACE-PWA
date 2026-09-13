const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const sharp = require('sharp');
const register = require('./profilePictureRoutes');

test('normalizes uploaded images to a compact 256px JPEG', async () => {
  const png = await sharp({create: {width: 400, height: 200, channels: 4, background: '#123456'}}).png().toBuffer();
  const result = await register.normalizePicture(png);
  assert.match(result, /^data:image\/jpeg;base64,/);
  const metadata = await sharp(Buffer.from(result.split(',')[1], 'base64')).metadata();
  assert.equal(metadata.width, 256); assert.equal(metadata.height, 256);
  assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.exif, undefined);
});

test('rejects invalid, oversized and unsupported image payloads', async () => {
  for (const bytes of [null, Buffer.alloc(0), Buffer.alloc(256 * 1024 + 1), Buffer.from('not an image'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')]) {
    await assert.rejects(register.normalizePicture(bytes));
  }
});

test('authenticated upload, reload and removal only affect the signed-in account', async t => {
  let stored = null;
  const writes = [];
  const pool = {async query(sql, args) {
    if (sql.startsWith('SELECT')) { assert.equal(args[0], 18); return {rows: [{profile_pic: stored}]}; }
    writes.push(args);
    if (sql.includes('SET profile_pic=NULL')) { assert.equal(args[0], 18); stored = null; }
    else { assert.equal(args[1], 18); stored = args[0]; }
    return {rows: [{u_id: 18}]};
  }};
  const app = express(); app.use(express.json());
  register(app, pool, (req, res, next) => {
    if (req.headers.authorization !== 'test-session') return res.status(401).json({error: 'Unauthorized'});
    req.user = {u_id: 18}; next();
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/profile-picture`;
  const headers = {Authorization: 'test-session', 'Content-Type': 'application/octet-stream'};
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await (await fetch(url, {headers})).json()).profilePic, null);
  const bytes = await sharp({create: {width: 20, height: 20, channels: 3, background: '#00aabb'}}).png().toBuffer();
  const saved = await fetch(`${url}?userId=99`, {method: 'PUT', headers, body: bytes});
  assert.equal(saved.status, 200);
  const data = await saved.json(); assert.ok(data.profilePic);
  const reload = await fetch(url, {headers});
  assert.equal(reload.headers.get('cache-control'), 'no-store');
  assert.equal((await reload.json()).profilePic, data.profilePic);
  assert.equal((await fetch(url, {method: 'PUT', headers, body: 'garbage'})).status, 400);
  assert.equal(writes.length, 1);
  assert.equal((await fetch(url, {method: 'PUT', headers, body: Buffer.alloc(256 * 1024 + 1)})).status, 413);
  assert.equal(writes.length, 1);
  assert.equal((await fetch(url, {method: 'DELETE', headers})).status, 200);
  assert.equal((await (await fetch(url, {headers})).json()).profilePic, null);
});
