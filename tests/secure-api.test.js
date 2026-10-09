import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecureApi } from '../netlify/lib/secure-api.mjs';
import { createClient } from '@supabase/supabase-js';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public-key',APP_ORIGIN:'https://claims.example'};
const user={id:'11111111-1111-4111-8111-111111111111',email:'test@example.invalid',factors:[{id:'22222222-2222-4222-8222-222222222222',factor_type:'totp',status:'verified'}]};
const token=aal=>`test.${Buffer.from(JSON.stringify({aal})).toString('base64url')}.signature`;
const verified=[token('aal1'),token('aal2')];
function mockClient(_url,_key,options){return {
 auth:{getUser:async jwt=>verified.includes(jwt)?{data:{user},error:null}:{data:null,error:new Error('Invalid')},signInWithPassword:async()=>({data:{user,session:{access_token:token('aal1'),expires_in:3600}},error:null})},
 from(table){const builder={select(){return this;},eq(){return this;},order(){return this;},maybeSingle:async()=>({data:table==='memberships'?{organization_id:'33333333-3333-4333-8333-333333333333',role:'analyst'}:null,error:null}),then(resolve){return Promise.resolve({data:table==='matters'?[]:null,error:null}).then(resolve);}};return builder;}
};}
function request(path,{method='GET',jwt,origin=env.APP_ORIGIN,body}={}){return new Request(env.APP_ORIGIN+path,{method,headers:{...(jwt?{Cookie:`__Host-cp_session=${jwt}`} : {}),...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});}
test('secure configuration fails closed when missing or insecure',()=>{
 assert.throws(()=>createSecureApi({},mockClient),{status:503});
 assert.throws(()=>createSecureApi({...env,APP_ORIGIN:'http://claims.example'},mockClient),{status:503});
});
test('missing, invalid, and password-only sessions cannot access matter data',async()=>{
 const api=createSecureApi(env,mockClient);
 assert.equal((await api(request('/api/matters'))).status,401);
 assert.equal((await api(request('/api/matters',{jwt:'forged'}))).status,401);
 const mfa=await api(request('/api/matters',{jwt:token('aal1')}));assert.equal(mfa.status,403);assert.match((await mfa.json()).error,/multi-factor/);
 const allowed=await api(request('/api/matters',{jwt:token('aal2')}));assert.equal(allowed.status,200);
});
test('password login returns HttpOnly secure cookie without exposing access or refresh tokens',async()=>{
 const api=createSecureApi(env,mockClient);const response=await api(request('/api/auth/login',{method:'POST',body:{email:user.email,password:'synthetic-password'}}));
 assert.equal(response.status,200);const cookie=response.headers.get('set-cookie');assert.match(cookie,/__Host-cp_session=/);assert.match(cookie,/Secure; HttpOnly; SameSite=Strict/);
 const data=await response.json();assert.equal(data.mfaRequired,true);assert.equal('access_token' in data,false);assert.equal('refresh_token' in data,false);
});
test('secure writes reject cross-origin requests before contacting the provider',async()=>{
 let calls=0;const api=createSecureApi(env,(...args)=>{calls++;return mockClient(...args);});
 const response=await api(request('/api/auth/login',{method:'POST',origin:'https://attacker.invalid',body:{email:user.email,password:'anything'}}));assert.equal(response.status,403);assert.equal(calls,0);
});
test('inaccessible matters fail closed without disclosing a record',async()=>{
 const api=createSecureApi(env,mockClient);const response=await api(request('/api/matters/44444444-4444-4444-8444-444444444444',{jwt:token('aal2')}));assert.equal(response.status,404);assert.equal('matter' in await response.json(),false);
});
test('MFA uses the verified cookie identity in actual SDK transport without a persisted session',async()=>{
 const calls=[];
 const providerFetch=async(url,options)=>{
  const path=new URL(url).pathname;
  assert.equal(new Headers(options.headers).get('authorization'),`Bearer ${token('aal1')}`);
  calls.push(path);
  let data;
  if(path==='/auth/v1/user')data=user;
  else if(path==='/auth/v1/factors')data={id:user.factors[0].id,type:'totp',totp:{secret:'synthetic-key'}};
  else if(path.endsWith('/challenge'))data={id:'synthetic-challenge',type:'totp'};
  else if(path.endsWith('/verify'))data={access_token:token('aal2'),refresh_token:'private-refresh',expires_in:3600,user};
  else throw new Error(`Unexpected transport: ${path}`);
  return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };
 const api=createSecureApi(env,(url,key,options)=>createClient(url,key,{...options,global:{...options.global,fetch:providerFetch}}));
 const enrolled=await api(request('/api/auth/enroll',{method:'POST',jwt:token('aal1')}));
 assert.equal(enrolled.status,200);assert.equal((await enrolled.json()).secret,'synthetic-key');
 const verified=await api(request('/api/auth/verify',{method:'POST',jwt:token('aal1'),body:{factorId:user.factors[0].id,code:'123456'}}));
 assert.equal(verified.status,200);assert.match(verified.headers.get('set-cookie'),/HttpOnly/);
 assert.deepEqual(await verified.json(),{verified:true});
 assert.equal(calls.filter(path=>path.endsWith('/verify')).length,1);
});
test('MFA rejects other users factors and oversized input before verification',async()=>{
 const api=createSecureApi(env,mockClient);
 const other=await api(request('/api/auth/verify',{method:'POST',jwt:token('aal1'),body:{factorId:'99999999-9999-4999-8999-999999999999',code:'123456'}}));
 assert.equal(other.status,403);
 const large=await api(request('/api/auth/login',{method:'POST',body:{email:user.email,password:'x'.repeat(33000)}}));
 assert.equal(large.status,413);
});
