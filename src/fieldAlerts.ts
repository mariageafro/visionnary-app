import type { Project } from './types';
import { minutesOf, runStages } from './schedule';
import { stageFrise, friseMoments, momentState } from './moments';
import { firingReminders } from './reminders';
import { departureISO, travelLegs } from './travel';
export interface FieldAlert {id:string;due:number;title:string;stageId?:string}
/** Fenêtre courte au retour d'un onglet ; seuls les rappels encore pertinents sont proposés. */
export function fieldAlerts(p:Project,now:number):FieldAlert[]{
 if(!p.alerts?.enabled)return [];
 const alerts:FieldAlert[]=firingReminders(p,now,60000).map(r=>({id:`reminder:${r.item.id}:${r.due}`,due:r.due!,title:r.item.title,stageId:String(r.item.stageId||'')}));
 const thresholds=[...new Set([...p.alerts.thresholds,0])].filter(t=>Number.isFinite(t)&&t>=0&&t<=120);
 const add=(id:string,title:string,end:number,stageId:string)=>{for(const t of thresholds){const due=end-t*60000;if(due<=now&&due>now-60000)alerts.push({id:`${p.id}:${id}:${end}:${t}`,due,title:t?`${title} : il reste ${t} min`:title+' : maintenant',stageId});}};
 for(const run of runStages(p)){
  if(run.state==='terminée'||run.item.status==='terminé'||run.item.status==='impossible')continue;
  const start=run.startedAt??run.plannedStart;
  if(start===null)continue;
  // Ne pas avertir à 20 min d'une étape de 10 min avant qu'elle ne commence.
  if(now>=start)add('end:'+run.item.id,'Fin de '+run.item.title,start+minutesOf(run.item)*60000,run.item.id);
  const shots=p.items.filter(i=>i.module==='shots'&&i.stageId===run.item.id&&i.status!=='archivé');
  for(const moment of friseMoments(stageFrise(p,run.item,shots))){
   if(moment.start===null||momentState(moment.shots).label==='fait')continue;
   const iso=departureISO(p.date,moment.start);if(!iso)continue;
   const momentStart=Date.parse(iso)+(run.startedAt&&run.plannedStart?run.startedAt-run.plannedStart:0);
   if(now>=momentStart)add('moment:'+moment.key,'Fin de '+moment.label,momentStart+moment.minutes*60000,run.item.id);
  }

 }
 for(const leg of travelLegs(p)){
  if(leg.to.startedAt||leg.to.endedAt||leg.to.status==='terminé')continue;
  const iso=departureISO(p.date,leg.depart);if(!iso)continue;
  add('travel:'+leg.to.id,'Départ vers '+leg.to.title,Date.parse(iso),leg.to.id);
 }
 return alerts.sort((a,b)=>b.due-a.due);
}
