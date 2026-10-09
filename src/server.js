import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore, AppError } from './store.js';

const assets = { '/': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/secure-ui.js': ['secure-ui.js','text/javascript'], '/styles.css': ['styles.css','text/css'] };
const headers = {
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'Cache-Control':'no-store'
};
async function body(req) {
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new AppError(415, 'Send JSON content.');
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=chunk.length; if(size>32000) throw new AppError(413,'Request is too large.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new AppError(400,'Invalid JSON.'); }
}
export function createApp({ filename = resolve(process.env.DATA_DIR || './data','workspace.sqlite') } = {}) {
  const store=openStore(filename);
  const server=http.createServer(async (req,res) => {
    const json=(status,data)=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    try {
      const host=req.headers.host ?? '';
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new AppError(403,'This development server only accepts localhost requests.');
      if(req.headers.origin && ![`http://${host}`].includes(req.headers.origin)) throw new AppError(403,'Cross-origin requests are not allowed.');
      if(req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site'])) throw new AppError(403,'Cross-site requests are not allowed.');
      const path=new URL(req.url,`http://${host}`).pathname;
      if(req.method==='GET' && assets[path]) {
        const [name,type]=assets[path];const file=await readFile(new URL(`../public/${name}`,import.meta.url));
        res.writeHead(200,{...headers,'Content-Type':`${type}; charset=utf-8`});res.end(file);return;
      }
      if(path==='/api/health' && req.method==='GET') return json(200,{status:'ok',mode:'local-development',milestone:'M1',authentication:false,readOnly:false});
      if(path==='/api/matters' && req.method==='GET') return json(200,{matters:store.list()});
      if(path==='/api/matters' && req.method==='POST') return json(201,{matter:store.create(await body(req))});
      if(path==='/api/demo' && req.method==='POST') { await body(req); return json(201,{matters:store.seed()}); }
      const match=path.match(/^\/api\/matters\/([a-f0-9-]{36})(\/activity)?$/);
      if(match) {
        if(req.method==='GET') return json(200,match[2]?{events:store.events(match[1])}:{matter:store.get(match[1])});
        if(req.method==='PATCH' && !match[2]) return json(200,{matter:store.update(match[1],await body(req))});
      }
      json(404,{error:'Not found.'});
    } catch(error) { json(error.status || 500,{error:error.status?error.message:'Something went wrong. Try again.'}); if(!error.status) console.error('Request failed:',error.code || error.name); }
  });
  server.on('close',()=>store.close());
  return {server,store};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.env.NODE_ENV==='production') throw new Error('M1 has no authentication. Production mode is disabled.');
  const port=Number(process.env.PORT || 3000);
  if(!Number.isInteger(port) || port<1 || port>65535) throw new Error('PORT must be 1–65535.');
  const {server}=createApp();server.listen(port,'127.0.0.1',()=>console.log(`The Coverage Position: http://localhost:${port}\nLocal development only. Use synthetic matters; authentication arrives in M2.`));
  const stop=()=>server.close(()=>process.exit(0));process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
