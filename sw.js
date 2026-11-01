/* Service worker — نظام الحضور والغياب
   غيّر رقم V عند أي تحديث جذري لإجبار تنظيف الذاكرة المؤقتة */
const V='nahj-v2';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const EXT=[
 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Aref+Ruqaa:wght@400;700&display=swap',
 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
const HOSTS=['fonts.googleapis.com','fonts.gstatic.com','cdnjs.cloudflare.com','www.gstatic.com'];

self.addEventListener('install',e=>{
 e.waitUntil((async()=>{
  const c=await caches.open(V);
  await Promise.allSettled([...CORE.map(u=>c.add(u)),...EXT.map(u=>fetch(u).then(r=>{if(r.ok)return c.put(u,r)}))]);
  self.skipWaiting();
 })());
});
self.addEventListener('activate',e=>{
 e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==V)await caches.delete(k);
  await self.clients.claim();
 })());
});

/* الصفحة نفسها: الشبكة أولاً (لتصل التحديثات) ثم النسخة المحفوظة عند انقطاع الإنترنت */
async function netFirst(r){
 const c=await caches.open(V);
 try{
  const res=await Promise.race([fetch(r),new Promise((_,j)=>setTimeout(j,4000))]);
  if(res&&res.ok)c.put(r,res.clone());
  return res;
 }catch(x){
  return (await c.match(r,{ignoreSearch:true}))||(r.mode==='navigate'?await c.match('./index.html'):null)||Response.error();
 }
}
/* المكتبات والخطوط: من الذاكرة فوراً مع تحديثها في الخلفية */
async function swr(r){
 const c=await caches.open(V),m=await c.match(r);
 const f=fetch(r).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone());return res}).catch(()=>null);
 return m||(await f)||Response.error();
}
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;
 const u=new URL(r.url);
 if(u.origin===location.origin)e.respondWith(netFirst(r));
 else if(HOSTS.includes(u.hostname))e.respondWith(swr(r));
 /* غير ذلك (Firestore وغيره) يمر مباشرة بدون تدخل */
});
