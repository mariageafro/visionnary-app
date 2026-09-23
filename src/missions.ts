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
// Sous-filtre combinable avec le côté (Tous/Mariée/Marié/Ensemble) : même granularité que les
// catégories de la Galerie photographe (poseCategories) et les chapitres du film (shotSections).
export type MissionTag = 'Garçons d’honneur' | 'Demoiselles d’honneur' | 'Famille' | 'Groupe';
export const missionTags: MissionTag[] = ['Garçons d’honneur', 'Demoiselles d’honneur', 'Famille', 'Groupe'];
const tagWords: Record<MissionTag, string[]> = {
  'Garçons d’honneur': ['garçon'],
  'Demoiselles d’honneur': ['demoiselle'],
  'Famille': ['famille'],
  'Groupe': ['groupe', 'invités', 'table'],
};
export function matchesTag(item: Item, tag: MissionTag | ''): boolean {
  if (!tag) return true;
  const text = [item.category, item.section, item.person, item.subject].filter(Boolean).join(' ').toLocaleLowerCase('fr');
  return tagWords[tag].some((w) => text.includes(w));
}
export function missionItems(p: Project) {
 const stages=p.items.filter(i=>i.module==='stages'&&i.status!=='archivé').sort((a,b)=>a.order-b.order);
 const rank=new Map(stages.map((s,n)=>[s.id,n]));
 return p.items.filter(i=>['shots','poses'].includes(i.module)&&i.status!=='archivé').sort((a,b)=>(rank.get(String(a.stageId))??999)-(rank.get(String(b.stageId))??999)||a.order-b.order);
}
export const pendingMission = (i: Item) => !done(i)&&!['sauté','impossible'].includes(i.status);
