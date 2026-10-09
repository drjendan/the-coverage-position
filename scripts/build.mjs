import { writeFileSync } from 'node:fs';
const mode=process.env.APP_MODE || 'preview';
if(!['preview','secure'].includes(mode))throw new Error('APP_MODE must be preview or secure.');
let connection="'self'";
if(mode==='secure'){
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY||!process.env.APP_ORIGIN)throw new Error('Secure mode requires Supabase URL/publishable key and APP_ORIGIN.');
 const url=new URL(process.env.SUPABASE_URL),site=new URL(process.env.APP_ORIGIN);
 if(url.protocol!=='https:'||site.protocol!=='https:'||site.origin!==process.env.APP_ORIGIN)throw new Error('Storage and exact application origin must use HTTPS.');
 connection+=` ${url.origin}`;
}
writeFileSync(new URL('../public/_headers',import.meta.url),`/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src ${connection}; base-uri 'none'; frame-ancestors 'none'; form-action 'self'\n`);
// Nothing from the server environment, including keys, is written into frontend assets.
console.log(`Prepared ${mode} frontend headers. No credentials are embedded.`);
