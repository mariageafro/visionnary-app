import type { Item, MediaEntry, Project } from './types';
import { makeItem, newProject } from './model';
import { importMedia } from './media';
import { deleteMedia, putMedia } from './storage';
import { sceneTemplates } from './scene/templates';

const files=['30575392.jpg','36237524.jpg','33403878.jpg','5206714.jpg','6645070.jpg','37008311.jpg','couple-mouvement.mp4'];
/** Une démo autonome, additive et modifiable ; les noms/missions sont fictifs. */
export async function buildWeddingDemo(progress:(text:string)=>void=()=>{}):Promise<Project>{
 const p=newProject('Aïcha & Malik · Démo');
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 p.date=[tomorrow.getFullYear(),String(tomorrow.getMonth()+1).padStart(2,'0'),String(tomorrow.getDate()).padStart(2,'0')].join('-');
 Object.assign(p,{couple:'Aïcha & Malik',venue:'Paris · lieux de démonstration',style:'Éditorial et documentaire',guests:120,features:['démo','photo','religious','reception'],mustHave:'Découverte, alliances, regards des parents, premier baiser.',avoid:'Interrompre la cérémonie ; gêner les invités.',services:'Photo et vidéo'});
 const photo=makeItem('team','Chloé · Photo',{role:'Photographe',order:0});const video=makeItem('team','David · Vidéo',{role:'Cadreur principal',order:1});const second=makeItem('team','Alex · Caméra B',{role:'Cadreur réactions',order:2});
 const venues=[['Préparatifs','Hôtel de Ville, Paris'],['Découverte','Square Jean XXIII, Paris'],['Mairie','Mairie du 6e arrondissement, Paris'],['Cérémonie religieuse','Église Saint-Sulpice, Paris'],['Portraits & cocktail','Jardin du Luxembourg, Paris'],['Réception','Hôtel de Ville, Montrouge']].map(([title,address],order)=>makeItem('venues',title,{address,notes:'Lieu indicatif de démonstration, aucune réservation réelle.',order}));
 const stages=venues.map((v,n)=>makeItem('stages',v.title,{venueId:v.id,time:['09:00','11:00','12:30','14:30','16:30','19:00'][n],duration:[60,20,30,60,80,180][n],order:n,travelMinutes:[0,20,15,10,10,25][n],setupMinutes:n===3?40:n===2?25:15,bufferMinutes:15,packMinutes:10,travelSource:'Manuelle',notes:'Programme fictif : adaptez les horaires, les adresses et les références.'}));
 p.items=[photo,video,second,...venues,...stages];
 const add=(module:'poses'|'shots',title:string,stage:number,side:string,section:string,extra:Partial<Item>={})=>{const i=makeItem(module,title,{stageId:stages[stage].id,subjectGroup:side,section,category:side==='Mariée'?'Mariée seule':side==='Marié'?'Marié seul':'Couple',operatorId:module==='poses'?photo.id:video.id,order:p.items.length,framing:'Plan poitrine',focal:'85 mm',media:module==='poses'?'photo':'video',priority:'MUST HAVE',light:'Lumière douce latérale, réflecteur en appoint',instruction:'Respirez, rapprochez-vous doucement et gardez un geste naturel.',notes:'Références illustratives de plusieurs couples. Remplacez-les par vos propres angles. Les valeurs de plan sont des consignes proposées, pas les métadonnées des photos.',...extra});p.items.push(i);return i;};
 const missions: {item:Item;images:number[]}[]=[];
 const define=(title:string,stage:number,side:string,section:string,images:number[],instruction:string)=>{
  const pose=add('poses',title,stage,side,section,{instruction});
  const shot=add('shots',title+' · mouvement',stage,side,section,{movement:stage===0?'Travelling lent':'Plan fixe puis rapprochement',shootMinutes:4,duration:6,angle:'À hauteur du regard',fps:'25 fps',camera:'CAM A'});
  missions.push({item:pose,images},{item:shot,images:[...images.slice(0,1),6]});
 };
 define('Habillage et derniers détails',0,'Mariée','Mariée · Habillage',[0,2],'Ajustez doucement le voile. Laissez vos proches terminer les attaches.');
 define('Le marié ajuste sa veste',0,'Marié','Marié · Habillage',[1,5],'Regardez vers la fenêtre, puis ajustez la manche sans regarder l’objectif.');
 define('Portrait de la mariée',0,'Mariée','Mariée · Seule',[2,0],'Tournez légèrement le buste vers la lumière et relâchez les épaules.');
 define('Le premier regard',1,'Ensemble','First look',[2,3],'Rapprochez-vous, puis retournez-vous au signal du photographe.');
 define('Les mains et les alliances',2,'Ensemble','Cérémonie',[3,1],'Rapprochez vos mains à hauteur de taille, sans cacher les alliances.');
 define('Échange des consentements',3,'Ensemble','Cérémonie',[4,3],'Pendant la cérémonie : observez, ne dirigez pas. Anticipez la réaction des proches.');
 define('Portrait enlacés',4,'Ensemble','Couple',[1,5,2],'Rapprochez les visages, puis regardez-vous. Gardez les mains visibles.');
 define('Marcher ensemble',4,'Ensemble','Couple',[5,2,3],'Marchez lentement côte à côte. Échangez quelques mots et gardez un rythme naturel.');
 define('Entrée et première danse',5,'Ensemble','Ouverture de bal',[2,5],'Laissez le mouvement se faire. Préservez un passage libre pour les caméras.');
 for(const stage of stages){p.items.push(makeItem('checklists','Batteries, cartes et balance des blancs',{stageId:stage.id,phase:'jourj',operatorId:video.id,order:p.items.length}),makeItem('checklists','Micros testés et caméras en place',{stageId:stage.id,phase:'jourj',operatorId:second.id,order:p.items.length+1}));}
 const shots=missions.filter(m=>m.item.module==='shots').map(m=>m.item);
 for(let n=0;n<shots.length-1;n++)p.items.push(makeItem('transitions',shots[n].title+' → '+shots[n+1].title,{fromId:shots[n].id,toId:shots[n+1].id,stageId:shots[n].stageId,movement:n%2?'J-cut':'Cut sur le mouvement',order:n}));
 const created:string[]=[];
 try{
  const sources:MediaEntry[]=[];
  for(const [n,file] of files.entries()){
   progress(`Références ${n+1}/${files.length}`);const response=await fetch('demo-wedding/'+file);if(!response.ok)throw Error('Une référence de démonstration est indisponible.');const blob=await response.blob();const m=await importMedia(new File([blob],file,{type:file.endsWith('.mp4')?'video/mp4':'image/jpeg'}),p.id,'');created.push(m.id);sources.push(m);
  }
  for(const {item,images} of missions){for(const [n,source] of images.entries()){const m={...sources[source],id:crypto.randomUUID(),itemId:item.id,name:source===6?'Mouvement illustratif · zoom animé depuis une photo':n===0?'Référence principale':'Inspiration alternative '+n};await putMedia(m);created.push(m.id);if(n===0)item.coverId=m.id;}}
  p.coverId=sources[2].id;
  p.scenePlans=([['chambre',0],['firstlook',1],['ceremonie',3],['salle',5]] as const).map(([templateId,stageIndex])=>{const scene=sceneTemplates.find(t=>t.id===templateId)!.build();scene.stageId=stages[stageIndex].id;scene.name=stages[stageIndex].title+' · placement';scene.elements=scene.elements.map((el,i)=>el.kind==='camera'?{...el,operatorId:i%2?video.id:second.id,referenceId:missions.find(m=>m.item.stageId===stages[stageIndex].id&&m.item.module==='shots')?.item.coverId as string,mission:i%2?'Suivre la mariée, mouvement doux':'Réaction du marié et des proches',shotIds:shots.filter(s=>s.stageId===stages[stageIndex].id).map(s=>s.id)}:el);return scene;});
  return p;
 }catch(e){await Promise.allSettled(created.map(deleteMedia));throw e;}
}
