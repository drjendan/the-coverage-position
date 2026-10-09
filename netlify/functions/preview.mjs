import { previewMatters } from '../../src/demo-fixtures.js';

const headers = {
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Robots-Tag':'noindex, nofollow'
};
const json = (status,body)=>new Response(JSON.stringify(body),{status,headers});

// Public READ-ONLY preview. No database, uploads, credentials, or AI requests.
// Do not extend this handler to accept live claims. M2 requires authenticated access.
export default async function handler(request) {
  if(request.method!=='GET') return json(403,{error:'This hosted preview is read-only. Matter creation, editing, and uploads are disabled.'});
  const path=new URL(request.url).pathname;
  if(path==='/api/health') return json(200,{status:'ok',mode:'synthetic-preview',milestone:'M1',authentication:false,readOnly:true});
  const matters=previewMatters();
  if(path==='/api/matters') return json(200,{matters});
  const match=path.match(/^\/api\/matters\/([a-f0-9-]{36})(\/activity)?$/);
  if(match) {
    const matter=matters.find(m=>m.id===match[1]);
    if(!matter)return json(404,{error:'Demo matter not found.'});
    // Do not fabricate a saved audit trail for static fixtures.
    return json(200,match[2]?{events:[]}:{matter});
  }
  return json(404,{error:'Not found.'});
}

export const config = { path:'/api/*' };
