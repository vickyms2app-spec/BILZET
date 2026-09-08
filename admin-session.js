const crypto=require('crypto');
const COOKIE='bilzet_v8_admin';
function secret(){const s=String(process.env.ADMIN_SESSION_SECRET||'');if(s.length<32)throw Object.assign(new Error('ADMIN_SESSION_SECRET must be at least 32 characters'),{status:500});return s}
function b64(v){return Buffer.from(v).toString('base64url')}
function sign(payload){return crypto.createHmac('sha256',secret()).update(payload).digest('base64url')}
function safeEq(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)}
function issue(res,email){const payload=b64(JSON.stringify({email,exp:Date.now()+12*60*60*1000}));const token=payload+'.'+sign(payload);const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`)}
function clear(res){const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`)}
function parseCookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)]}))}
function requireAdmin(req){const token=parseCookies(req)[COOKIE];if(!token)throw Object.assign(new Error('Admin login required'),{status:401});const [payload,sig]=token.split('.');if(!payload||!sig||!safeEq(sign(payload),sig))throw Object.assign(new Error('Invalid admin session'),{status:401});let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString())}catch{throw Object.assign(new Error('Invalid admin session'),{status:401})}if(!data.exp||data.exp<Date.now())throw Object.assign(new Error('Admin session expired'),{status:401});const expected=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();if(!expected||String(data.email).toLowerCase()!==expected)throw Object.assign(new Error('Admin session rejected'),{status:401});return data}
module.exports={issue,clear,requireAdmin,safeEq};
