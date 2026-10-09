import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/preview.mjs';

const request=(path,options)=>new Request(`https://preview.example${path}`,options);
test('hosted preview exposes only marked fictional matters and no saved audit trail',async()=>{
  const health=await handler(request('/api/health'));assert.equal((await health.json()).readOnly,true);
  const response=await handler(request('/api/matters'));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const {matters}=await response.json();assert.equal(matters.length,3);assert.ok(matters.every(m=>m.is_demo===1&&m.organization_id==='synthetic-preview'));
  const detail=await handler(request(`/api/matters/${matters[0].id}`));assert.equal((await detail.json()).matter.claim_number,'DEMO-1001');
  const activity=await handler(request(`/api/matters/${matters[0].id}/activity`));assert.deepEqual((await activity.json()).events,[]);
  assert.equal((await handler(request('/api/matters/00000000-0000-0000-0000-000000000000'))).status,404);
});
test('hosted preview rejects every write method including direct API calls',async()=>{
  for(const method of ['POST','PATCH','PUT','DELETE'])for(const path of ['/api/matters','/api/demo','/api/uploads']){
    const response=await handler(request(path,{method,body:'{"insured":"must not be stored"}'}));assert.equal(response.status,403);assert.match((await response.json()).error,/read-only/);
  }
});
