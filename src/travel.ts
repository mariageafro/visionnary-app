import type { Item, Project } from './types';
import { toClock, toMinutes } from './moments';
const minutes=(v:unknown,fallback:number)=>v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Math.round(Number(v)):fallback;
export const setupDefault=(title:string)=>/relig|église|eglise/i.test(title)?40:/mairie|civil/i.test(title)?25:20;
export const addressOf=(p:Project,s:Item)=>String(p.items.find(i=>i.id===s.venueId)?.address||s.address||'').trim();
export const travelKey=(origin:string,destination:string,date:string)=>JSON.stringify([origin.trim(),destination.trim(),date]);
export function travelLegs(p:Project){
 const stages=p.items.filter(i=>i.module==='stages'&&i.status!=='archivé').sort((a,b)=>a.order-b.order);
 let offset=0,last:number|null=null;
 const times=stages.map(s=>{const t=toMinutes(s.time);if(t===null)return null;if(last!==null&&t+offset<last)offset+=1440;last=t+offset;return last;});
 return stages.slice(1).map((to,n)=>{
  const from=stages[n];const origin=String(to.travelOrigin||addressOf(p,from));const destination=String(to.travelDestination||addressOf(p,to));
  const same=!!origin&&origin.toLocaleLowerCase()===destination.toLocaleLowerCase();
  const drive=to.travelMinutes===undefined||to.travelMinutes===''?(same?0:null):minutes(to.travelMinutes,0);
  const setup=minutes(to.setupMinutes,setupDefault(to.title));const buffer=minutes(to.bufferMinutes,10);const pack=minutes(to.packMinutes,10);
  const starts=times[n+1];const arrive=starts===null?null:starts-setup;const depart=arrive===null||drive===null?null:arrive-drive-buffer;const finish=depart===null?null:depart-pack;
  const previousEnd=times[n]===null?null:times[n]!+minutes(from.duration,30);
  const conflict=finish!==null&&previousEnd!==null?Math.max(0,previousEnd-finish):0;
  const source=to.travelSource==='Google Maps'&&to.travelKey===travelKey(origin,destination,p.date)?'Google Maps':'Manuelle';
  const stale=to.travelSource==='Google Maps'&&(source!=='Google Maps'||!to.travelCheckedAt||Date.now()-Date.parse(String(to.travelCheckedAt))>3600000||!to.travelDeparture||Math.abs(Date.parse(String(to.travelDeparture))-Date.parse(departureISO(p.date,depart)||''))>15*60000);
  return {from,to,origin,destination,drive,setup,buffer,pack,starts,arrive,depart,finish,previousEnd,conflict,source,stale};
 });
}
export function travelClock(value:number|null){if(value===null)return 'À calculer';const day=Math.floor(value/1440);return toClock(value)+(day?` (J${day>0?'+':''}${day})`:'');}
export function departureISO(date:string,minutes:number|null){if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||minutes===null)return null;const d=new Date(date+'T00:00:00');d.setMinutes(minutes);return Number.isFinite(d.getTime())?d.toISOString():null;}
