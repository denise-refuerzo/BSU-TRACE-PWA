const test = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { resolveChatDocument, resolveChatRoom } = require('./chatAccess');

test('overview or shared-office affiliation does not grant document chat access', async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE public.initial_document (
      ini_id serial PRIMARY KEY,public_id uuid DEFAULT gen_random_uuid(),u_id integer,submission_office_id integer
    );
    CREATE TABLE public.processed_document (
      pd_id serial PRIMARY KEY,ini_id integer,current_office_id integer,s_id integer,time_out timestamptz
    );
    CREATE TABLE public.chat_rooms (
      room_id serial PRIMARY KEY,public_id uuid DEFAULT gen_random_uuid(),ini_id integer,o_id integer
    );
    INSERT INTO public.initial_document(u_id,submission_office_id) VALUES (1,10);
    INSERT INTO public.processed_document(ini_id,current_office_id,s_id,time_out) VALUES (1,20,1,NULL);
    INSERT INTO public.chat_rooms(ini_id,o_id) VALUES (1,20);
  `);
  const documentId = (await db.query('SELECT public_id FROM public.initial_document')).rows[0].public_id;
  const roomId = (await db.query('SELECT public_id FROM public.chat_rooms')).rows[0].public_id;

  assert.ok(await resolveChatDocument(db, documentId, { u_id: 1, a_id: 1, o_id: null }), 'owner may chat');
  assert.equal(await resolveChatDocument(db, documentId, { u_id: 2, a_id: 2, o_id: 10 }), null, 'coworker or overview user may not chat');
  assert.ok(await resolveChatDocument(db, documentId, { u_id: 3, a_id: 2, o_id: 20 }), 'current processing office may chat');
  assert.ok(await resolveChatRoom(db, roomId, { u_id: 3, a_id: 2, o_id: 20 }), 'processor may open its active office room');

  await db.exec('UPDATE public.processed_document SET time_out=NOW() WHERE ini_id=1');
  assert.equal(await resolveChatDocument(db, documentId, { u_id: 1, a_id: 1, o_id: null }), null, 'inactive documents leave chat');
  await db.close();
});
