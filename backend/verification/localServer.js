// Isolated verification only: reuse the real HTTP server with an in-memory
// database built from schema declarations, never the dump's personal records.
// Usage: node verification/localServer.js <path-to-database.sql>
const fs = require('node:fs');
const {PGlite} = require('@electric-sql/pglite');
const bcrypt = require('bcrypt');

async function main() {
  const dump = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g,'\n');
  const db = new PGlite();
  const declarations = [
    /^CREATE TABLE public\.[\s\S]*?^\);/gm,
    /^CREATE SEQUENCE public\.[\s\S]*?;/gm,
    /^ALTER TABLE public\.[^\n]*ADD GENERATED[\s\S]*?^\);/gm,
    /^ALTER TABLE ONLY public\.[^\n]* ALTER COLUMN [^\n]*;/gm,
    /^ALTER TABLE ONLY public\.[^\n]*\n\s+ADD CONSTRAINT[\s\S]*?;/gm,
    /^CREATE (?:UNIQUE )?INDEX [^\n]*;/gm
  ];
  for (const pattern of declarations) {
    for (const match of dump.matchAll(pattern)) await db.exec(match[0]);
  }
  await db.exec('ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS two_fa_code_expires timestamp without time zone, ADD COLUMN IF NOT EXISTS two_fa_attempts integer NOT NULL DEFAULT 0;');
  await db.exec(`SET TIME ZONE 'Asia/Manila';
    INSERT INTO public.account VALUES (1,'Originator'),(2,'Processor'),(3,'Signee'),(4,'GSO Admin'),(5,'ICT Admin');
    INSERT INTO public.department VALUES (1,'Verification Department');
    INSERT INTO public.offices VALUES (1,'Office A'),(2,'Office B'),(3,'Office C'),(4,'Office D'),(8,'Outside Office'),(11,'College Office'),(999,'College Placeholder');
    INSERT INTO public.status VALUES (1,'pending'),(2,'In Verification'),(3,'Signed'),(4,'Action Required'),(5,'Completed'),(6,'Verified'),(7,'Approved');
    INSERT INTO public.document_category (category_name) VALUES ('Verification');
    INSERT INTO public.route (stop_1,stop_2,stop_3,stop_4) VALUES (1,2,3,4),(1,2,NULL,NULL),(1,2,2,4),(999,2,NULL,NULL);
    INSERT INTO public.process_type (r_id,process_name,is_active,category_id) VALUES
      (1,'Verification Route A-B-C-D',true,1),(2,'Verification Short Route',true,1),
      (3,'Verification Repeated Office',true,1),(4,'Verification College Route',true,1);
  `);
  const password = await bcrypt.hash('LocalVerify123!',4);
  for (const [id,role,office] of [[1,1,null],[2,2,1],[3,3,2],[4,4,3],[5,2,4],[6,5,null],[7,2,8],[8,1,null],[9,2,11]]) {
    await db.query(`INSERT INTO public."User" (u_id,a_id,d_id,o_id,username,password,full_name,uni_email,is_active)
      VALUES ($1,$2,1,$3,$4,$5,$6,$7,true)`,[id,role,office,`verify${id}`,password,`Verification User ${id}`,`verify${id}@example.invalid`]);
  }
  let queue=Promise.resolve();
  async function acquire() { const prior=queue; let unlock;queue=new Promise(resolve=>{unlock=resolve;});await prior;return unlock; }
  const pool={
    async query(...args) {const unlock=await acquire();try{return await db.query(...args);}finally{unlock();}},
    async connect() {const unlock=await acquire();return {query:(...args)=>db.query(...args),release:unlock};}
  };
  require.cache[require.resolve('../db')]={exports:pool};
  const suppressEmail=async()=>{console.log('[verification] External email suppressed');};
  require.cache[require.resolve('../mailer')]={exports:{sendResetCodeEmail:suppressEmail,sendTrackingAlertEmail:suppressEmail,sendSystemEmail:suppressEmail}};
  process.env.PORT='5055';
  process.env.JWT_SECRET='isolated-local-verification-key';
  process.env.PYTHON_MICROSERVICE_URL='http://127.0.0.1:5056';
  const express=require('express');
  const listen=express.application.listen;
  express.application.listen=function(port,callback){return listen.call(this,port,'127.0.0.1',callback);};
  require('../server');
  console.log('Isolated verification database ready. Synthetic accounts verify1–verify9. No live database or email access.');
}
main().catch(err=>{console.error(err);process.exit(1);});
