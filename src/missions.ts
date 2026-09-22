import type { Item, Project } from './types';
import { done } from './model';
export type Subject = 'Tous' | 'Mariée' | 'Marié' | 'Ensemble';
export const subjects: Subject[] = ['Tous','Mariée','Marié','Ensemble'];
export function subjectOf(item: Item): Subject {
  if(subjects.includes(item.subjectGroup as Subject)) return item.subjectGroup as Subject;
  const text=String(item.section || item.category || item.subject || '').toLocaleLowerCase('fr');
  if(text.includes('mariée'))return 'Mariée';
  if(text.includes('marié')&&!text.includes('mariés'))return 'Marié';
  return 'Ensemble';
}
export function missionItems(p: Project) {
 const stages=p.items.filter(i=>i.module==='stages'&&i.status!=='archivé').sort((a,b)=>a.order-b.order);
 const rank=new Map(stages.map((s,n)=>[s.id,n]));
 return p.items.filter(i=>['shots','poses'].includes(i.module)&&i.status!=='archivé').sort((a,b)=>(rank.get(String(a.stageId))??999)-(rank.get(String(b.stageId))??999)||a.order-b.order);
}
export const pendingMission = (i: Item) => !done(i)&&!['sauté','impossible'].includes(i.status);
