// Exporte les poses (favoris, masquées, séries) + photos de l'app de bureau vers public/seed/andy-maeva-7k2q/. Usage : lancer l'app avec --remote-debugging-port=9333 (sur une COPIE du dossier de données), puis node scripts/export-poses.mjs <dossier>.
import fs from 'fs';
const OUT=process.argv[2];fs.mkdirSync(OUT+'/ph',{recursive:true});
const pages=await (await fetch('http://127.0.0.1:9333/json')).json();
const ws=new WebSocket(pages[0].webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pend={};ws.onmessage=e=>{const m=JSON.parse(e.data);pend[m.id]?.(m)};
const ev=expr=>new Promise(res=>{const i=++id;pend[i]=m=>res(m.result.exceptionDetails?Promise.reject(JSON.stringify(m.result.exceptionDetails.exception.description)):m.result.result.value);ws.send(JSON.stringify({id:i,method:'Runtime.evaluate',params:{expression:expr,awaitPromise:true,returnByValue:true}}))});
const pre=`(async()=>{window.__db=window.__db||await new Promise((res,rej)=>{const r=indexedDB.open('visionnary-local');r.onsuccess=()=>res(r.result);r.onerror=rej});return 1})()`;
await ev(pre);
const meta=await ev(`(async()=>{
const db=window.__db;const g=(s,k)=>new Promise(r=>{const q=db.transaction(s).objectStore(s).get(k);q.onsuccess=()=>r(q.result)});
const a=s=>new Promise(r=>{const q=db.transaction(s).objectStore(s).getAll();q.onsuccess=()=>r(q.result)});
const w=await g('workspace','current');const p=w.projects.find(p=>!p.library&&p.couple==='Andy & Maeva');
const drop=['module','stageId','time','venue','instruction','section','packKey','sourceMediaId','doneBy','doneAt','assignee','anglesDone'];
const poses=p.items.filter(i=>i.module==='poses').map(i=>{const o={...i};drop.forEach(k=>delete o[k]);return o});
const ids=new Set(poses.map(i=>i.id));
const media=(await a('media')).filter(m=>m.projectId===p.id&&ids.has(m.itemId)&&m.type==='image/jpeg').map(m=>({id:m.id,itemId:m.itemId,name:m.name}));
window.__mediaIds=media.map(m=>m.id);
return {poses,media,sections:p.poseSections};})()`);
console.log(meta.poses.length,meta.media.length);
fs.writeFileSync(OUT+'/meta.json',JSON.stringify(meta));
const B=30;
for(let s=0;s<meta.media.length;s+=B){
 const ids=meta.media.slice(s,s+B).map(m=>m.id);
 const r=await ev(`(async()=>{const db=window.__db;const out={};
 for(const id of ${JSON.stringify(ids)}){const m=await new Promise(r=>{const q=db.transaction('media').objectStore('media').get(id);q.onsuccess=()=>r(q.result)});
  const bmp=await createImageBitmap(m.blob);const k=Math.min(1,900/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  out[id]=c.toDataURL('image/jpeg',0.8).split(',')[1];}
 return out;})()`);
 for(const [k,v] of Object.entries(r))fs.writeFileSync(`${OUT}/ph/${k}.jpg`,Buffer.from(v,'base64'));
 process.stdout.write('.');
}
console.log('fini');process.exit(0);
