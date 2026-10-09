import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { validateMatter } from '../../src/validation.js';

const COOKIE='__Host-cp_session';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const json=(status,data,cookie)=>new Response(JSON.stringify(data),{status,headers:{...headers,...(cookie?{'Set-Cookie':cookie}:{})}});
const setCookie=session=>`${COOKIE}=${session.access_token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${Math.min(session.expires_in || 1800,3600)}`;
const clearCookie=`${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`;
function tokenFrom(request){return (request.headers.get('cookie') || '').split(';').map(c=>c.trim()).find(c=>c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1);}
function assurance(token){try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).aal;}catch{return null;}}
async function input(request){
 if(!(request.headers.get('content-type') || '').startsWith('application/json'))throw new HttpError(415,'Send JSON content.');
 const reader=request.body?.getReader();if(!reader)throw new HttpError(400,'Request body is required.');
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32000){await reader.cancel();throw new HttpError(413,'Request is too large.');}chunks.push(value);}
 const raw=Buffer.concat(chunks).toString('utf8');
 try{const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw 0;return value;}catch{throw new HttpError(400,'Invalid request.');}
}
function check(result){if(result.error){if(result.error.code==='23505')throw new HttpError(409,'This claim number already exists.');throw new HttpError(400,'The requested operation could not be completed. Check your permissions or supplied data.');}return result.data;}
function publicSession(user,token){const factor=user.factors?.find(f=>f.factor_type==='totp'&&f.status==='verified');return {user:{id:user.id,email:user.email},mfaRequired:assurance(token)!=='aal2',factorId:factor?.id || null};}

export function createSecureApi(env=process.env,makeClient=createClient){
 const url=env.SUPABASE_URL,key=env.SUPABASE_PUBLISHABLE_KEY,origin=env.APP_ORIGIN;
 if(!url||!key||!origin)throw new HttpError(503,'Secure backend configuration is incomplete.');
 const backend=new URL(url),site=new URL(origin);
 if(backend.protocol!=='https:'||site.protocol!=='https:'||site.origin!==origin)throw new HttpError(503,'Secure backend requires HTTPS and an exact application origin.');
 const client=token=>makeClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:token?{Authorization:`Bearer ${token}`}:{}}});
 async function session(request,requireMfa=true){
  const token=tokenFrom(request);if(!token)throw new HttpError(401,'Sign in to continue.');
  const c=client(token);const {data,error}=await c.auth.getUser(token);
  if(error||!data?.user)throw new HttpError(401,'Your session has expired. Sign in again.');
  // Read assurance only AFTER the Auth server validates the token and user.
  if(requireMfa&&assurance(token)!=='aal2')throw new HttpError(403,'Complete multi-factor verification first.');
  return {token,c,user:data.user};
 }
 async function membership(c,user){const data=check(await c.from('memberships').select('organization_id,role').eq('user_id',user.id).eq('active',true).maybeSingle());if(!data)throw new HttpError(403,'No active workspace membership. Contact your administrator.');return data;}
 async function matter(c,id){const data=check(await c.from('matters').select('*').eq('id',id).maybeSingle());if(!data)throw new HttpError(404,'Matter not found or access denied.');return data;}
 return async function handler(request){
  try{
   const path=new URL(request.url).pathname;
   if(request.method!=='GET'&&request.headers.get('origin')!==origin)throw new HttpError(403,'Cross-origin requests are not allowed.');
   if(path==='/api/health'&&request.method==='GET')return json(200,{status:'ok',mode:'secure-pilot',milestone:'M2A',authentication:true,readOnly:false});
   if(path==='/api/auth/login'&&request.method==='POST'){
    const body=await input(request);if(typeof body.email!=='string'||body.email.length>254||typeof body.password!=='string'||body.password.length>512)throw new HttpError(400,'Email and password are required.');
    const {data,error}=await client().auth.signInWithPassword({email:body.email.trim(),password:body.password});
    if(error||!data?.session)throw new HttpError(401,'Sign-in failed. Check your credentials or try again later.');
    return json(200,publicSession(data.user,data.session.access_token),setCookie(data.session));
   }
   if(path==='/api/auth/logout'&&request.method==='POST'){
    const token=tokenFrom(request);
    if(token)await fetch(`${backend.origin}/auth/v1/logout?scope=local`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`}}).catch(()=>null);
    return json(200,{signedOut:true},clearCookie);
   }
   const {token,c,user}=await session(request,!path.startsWith('/api/auth/'));
   if(path==='/api/auth/session'&&request.method==='GET'){
    const state=publicSession(user,token);if(!state.mfaRequired)state.membership=await membership(c,user);return json(200,state);
   }
   if(path==='/api/auth/enroll'&&request.method==='POST'){
    const {data,error}=await c.auth.mfa.enroll({factorType:'totp',friendlyName:`Coverage Position ${randomUUID().slice(0,8)}`});
    if(error)throw new HttpError(400,'Unable to enroll authenticator. Contact your administrator if enrollment is restricted.');
    return json(200,{factorId:data.id,secret:data.totp.secret});
   }
   if(path==='/api/auth/verify'&&request.method==='POST'){
    const body=await input(request);if(!uuid.test(body.factorId || '')||!/^\d{6}$/.test(body.code || ''))throw new HttpError(400,'Enter the six-digit authenticator code.');
    if(!user.factors?.some(f=>f.id===body.factorId&&f.factor_type==='totp'))throw new HttpError(403,'Authenticator not found.');
    const {data,error}=await c.auth.mfa.challengeAndVerify({factorId:body.factorId,code:body.code});
    if(error||!data?.access_token)throw new HttpError(401,'Authenticator verification failed. Try the current code.');
    return json(200,{verified:true},setCookie(data));
   }
   const member=await membership(c,user);
   if(path==='/api/matters'&&request.method==='GET')return json(200,{matters:check(await c.from('matters').select('*').order('updated_at',{ascending:false}))});
   if(path==='/api/matters'&&request.method==='POST'){
    if(!['admin','analyst'].includes(member.role))throw new HttpError(403,'Your role cannot create matters.');
    const value=validateMatter(await input(request));value.incident_date=value.incident_date||null;
    return json(201,{matter:check(await c.from('matters').insert({...value,organization_id:member.organization_id}).select().single())});
   }
   const match=path.match(/^\/api\/matters\/([a-f0-9-]{36})(?:\/(activity|documents))?$/);
   if(match&&uuid.test(match[1])){
    const id=match[1];const current=await matter(c,id);
    if(!match[2]&&request.method==='GET')return json(200,{matter:current});
    if(!match[2]&&request.method==='PATCH'){
     const body=await input(request);if(!Number.isInteger(body.version))throw new HttpError(400,'The saved version is required.');
     const value=validateMatter(body);value.incident_date=value.incident_date||null;
     const updated=check(await c.from('matters').update(value).eq('id',id).eq('version',body.version).select());
     if(!updated.length)throw new HttpError(409,'Matter changed or edit access is unavailable. Reload before editing.');return json(200,{matter:updated[0]});
    }
    if(match[2]==='activity'&&request.method==='GET')return json(200,{events:check(await c.from('audit_events').select('action,actor,version,created_at').eq('matter_id',id).order('created_at',{ascending:false}))});
    if(match[2]==='documents'&&request.method==='GET')return json(200,{documents:check(await c.from('documents').select('*').eq('matter_id',id).order('created_at',{ascending:false}))});
    if(match[2]==='documents'&&request.method==='POST'){
     const body=await input(request);
     if(typeof body.filename!=='string'||body.filename.length>180||!body.filename.toLowerCase().endsWith('.pdf')||/[\x00-\x1f/\\]/.test(body.filename))throw new HttpError(400,'Use a PDF filename without path separators.');
     if(!Number.isInteger(body.byte_size)||body.byte_size<5||body.byte_size>52428800||!['complaint','policy','supporting'].includes(body.document_type)||!/^[a-f0-9]{64}$/.test(body.client_sha256||''))throw new HttpError(400,'Invalid document metadata. PDFs must be 50 MB or smaller.');
     const documentId=randomUUID(),path=`${current.organization_id}/${id}/${documentId}/source.pdf`;
     const doc=check(await c.from('documents').insert({id:documentId,matter_id:id,organization_id:current.organization_id,filename:body.filename,document_type:body.document_type,byte_size:body.byte_size,client_sha256:body.client_sha256,storage_path:path}).select().single());
     const signed=check(await c.storage.from('claim-documents').createSignedUploadUrl(path,{upsert:false}));
     // Restrict returned capability to the configured storage origin. Never expose the session token.
     if(new URL(signed.signedUrl).origin!==backend.origin)throw new HttpError(502,'Unexpected storage destination.');
     return json(201,{document:doc,uploadUrl:signed.signedUrl});
    }
   }
   const finish=path.match(/^\/api\/documents\/([a-f0-9-]{36})\/complete$/);
   if(finish&&uuid.test(finish[1])&&request.method==='POST')return json(200,{document:check(await c.rpc('finish_upload',{document_id:finish[1]}))});
   throw new HttpError(404,'Not found.');
  }catch(error){return json(error.status||400,{error:error.status?error.message:'The operation could not be completed.'});}
 };
}
