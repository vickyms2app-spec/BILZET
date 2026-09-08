const CACHE='bilzet-v10-4-final-login-20260908';
const SHELL=['/','/index.html','/404.html','/site.webmanifest','/assets/pharmacy.js','/assets/offline.js','/assets/bilzet-logo.svg','https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js','https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js','https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/dist/umd/supabase.min.js'];
self.addEventListener('install',e=>{e.waitUntil((async()=>{const c=await caches.open(CACHE);for(const u of SHELL){try{await c.add(u)}catch{}}await self.skipWaiting()})())});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET')return;
  if(u.pathname.startsWith('/admin')||u.pathname.startsWith('/api/admin-'))return;

  // Auth/config/app code must never be served stale while online.
  if(u.pathname==='/api/config'||u.pathname==='/assets/backend.js'||u.pathname==='/assets/pharmacy.js'||u.pathname==='/assets/offline.js'){
    e.respondWith((async()=>{const c=await caches.open(CACHE);try{const n=await fetch(r,{cache:'no-store'});if(n.ok&&u.pathname!=='/api/config')await c.put(r,n.clone());return n}catch{return u.pathname==='/api/config'?new Response(JSON.stringify({configured:false}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}):(await c.match(r))||Response.error()}})());
    return;
  }

  // Always load the newest page when internet is available.
  if(r.mode==='navigate'){
    e.respondWith((async()=>{try{return await fetch(r,{cache:'no-store'})}catch{return (await caches.match('/index.html'))||Response.error()}})());
    return;
  }

  e.respondWith((async()=>{const c=await caches.open(CACHE),hit=await c.match(r);if(hit)return hit;try{const n=await fetch(r);if(n.ok)await c.put(r,n.clone());return n}catch{return Response.error()}})());
});
