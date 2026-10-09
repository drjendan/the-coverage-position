import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../src/store.js';
import { createApp } from '../src/server.js';

const fixture = {claim_number:'TRAINING-0001',title:'Synthetic incident',insured:'Example Insured LLC',jurisdiction:'New York',claimant:'Test Claimant',status:'New'};

test('create, reopen after database restart, and update matter with activity history',()=>{
  const dir=mkdtempSync(join(tmpdir(),'coverage-test-'));const filename=join(dir,'test.sqlite');let store;
  try {
    store=openStore(filename);const created=store.create(fixture);assert.equal(created.claim_number,'TRAINING-0001');store.close();
    store=openStore(filename);assert.equal(store.get(created.id).insured,fixture.insured);
    const updated=store.update(created.id,{...created,title:'Updated training title',status:'Needs Information'});
    assert.equal(updated.version,2);assert.equal(updated.status,'Needs Information');assert.equal(store.events(created.id).length,2);
    assert.throws(()=>store.update(created.id,{...created,title:'Stale edit'}),{status:409});
    assert.equal(store.get(created.id).title,'Updated training title');
  } finally {store?.close();rmSync(dir,{recursive:true,force:true});}
});

test('required fields, duplicate claims, dates and unavailable statuses are rejected',()=>{
  const store=openStore(':memory:');try {
    assert.throws(()=>store.create({...fixture,insured:' '}),{status:400});
    assert.throws(()=>store.create({...fixture,incident_date:'2026-02-30'}),{status:400});
    assert.throws(()=>store.create({...fixture,status:'Approved'}),{status:400});
    assert.throws(()=>store.create({...fixture,claimant:{name:'invalid'}}),{status:400});
    store.create(fixture);assert.throws(()=>store.create(fixture),{status:409});assert.equal(store.list().length,1);
  } finally {store.close();}
});

test('demo seeding is explicit, synthetic, and only allowed in an empty workspace',()=>{
  const store=openStore(':memory:');try {assert.equal(store.list().length,0);const demos=store.seed();assert.equal(demos.length,3);assert.ok(demos.every(m=>m.is_demo===1&&m.claim_number.startsWith('DEMO-')));assert.throws(()=>store.seed(),{status:409});}finally{store.close();}
});

test('HTTP API handles creation, update, missing IDs, and rejects cross-origin calls',async()=>{
  const {server}=createApp({filename:':memory:'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const root=`http://127.0.0.1:${server.address().port}`;
  try {
    const create=await fetch(`${root}/api/matters`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(fixture)});assert.equal(create.status,201);const {matter}=await create.json();
    const update=await fetch(`${root}/api/matters/${matter.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({...matter,notes:'Saved note'})});assert.equal(update.status,200);
    assert.equal((await(await fetch(`${root}/api/matters/${matter.id}`)).json()).matter.notes,'Saved note');
    const forbidden=await fetch(`${root}/api/matters`,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://untrusted.example'},body:JSON.stringify(fixture)});assert.equal(forbidden.status,403);
    const page=await fetch(root);assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
    assert.equal((await fetch(`${root}/api/matters/00000000-0000-0000-0000-000000000000`)).status,404);
    const malformed=await fetch(`${root}/api/matters`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(malformed.status,400);
  } finally {await new Promise(r=>server.close(r));}
});
