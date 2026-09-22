import { useRef, useState } from 'react';
import { Camera, ChevronRight, Clapperboard, Map, Pencil, Plus } from 'lucide-react';
import { useProject } from '../store';
import { done, makeItem } from '../model';
import type { Item } from '../types';
import { missionItems, pendingMission, subjectOf, subjects, type Subject } from '../missions';
import { Screen, Thumb, navigate, useMedia } from '../ui';
import { ItemEditor, MediaCard, itemsOf, mediaFor, operatorsOf } from './common';
import ShotViewer from './ShotViewer';
import { PoseViewer } from './PoseBoard';
import QuickStatus from './QuickStatus';
import './missions.css';
import { isPhotoShot, isVideoShot } from '../stageStats';
import { travelLegs, travelClock } from '../travel';

export default function MissionBoard(){
 const {project:p}=useProject(); const media=useMedia(p.id);
 const [subject,setSubject]=useState<Subject>('Tous');const [stageId,setStageId]=useState('');
 const [kind,setKind]=useState('all');const [editing,setEditing]=useState<Item|null>(null);const [viewing,setViewing]=useState<Item|null>(null);
 const swipe=useRef<{x:number;y:number}|null>(null);
 const stages=itemsOf(p,'stages');const operators=operatorsOf(p);
 const all=missionItems(p);const list=all.filter(i=>(subject==='Tous'||subjectOf(i)===subject)&&(!stageId||i.stageId===stageId)&&(kind==='all'||(kind==='photo'?i.module==='poses'||isPhotoShot(i):i.module==='shots'&&isVideoShot(i))));
 const next=list.find(pendingMission);const stage=stages.find(i=>i.id===stageId);
 const legs=travelLegs(p);
 const displayStages=stageId?[stage]:[...stages,undefined];
 return <Screen title="Votre journée" actions={<button className="icon-btn" aria-label="Personnaliser le tournage" onClick={()=>navigate('/tournage')}><Pencil size={18}/></button>}>
 <div className="mission-intro"><div><small>{p.date ? new Date(p.date+'T12:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}):'Date à définir'}</small><h2>{p.couple||p.name}</h2></div><button className="btn small" onClick={()=>navigate('/tournages')}>Changer</button></div>
 {p.features?.includes("démo")&&<p className="muted">Démo modifiable · missions fictives, photos d’inspiration de plusieurs mariages. <a href="demo-wedding/sources.html" target="_blank" rel="noopener noreferrer">Crédits des images</a></p>}
 <div className="mission-shortcuts"><button onClick={()=>navigate('/m/poses')}><Camera size={19}/> Galerie photographe</button><button onClick={()=>navigate('/scenes')}><Map size={19}/> Plans de scène</button></div>
 <button className="mission-alert-link" onClick={()=>navigate("/rappels")}>Rappels terrain <span>{p.alerts?.enabled?`Activés · ${p.alerts.thresholds.join(" / ")} min`:"Activer les alertes"} →</span></button>
 <div className="mission-filters"><select aria-label="Moment de la journée" value={stageId} onChange={e=>setStageId(e.target.value)}><option value="">Toute la journée</option>{stages.map(s=><option key={s.id} value={s.id}>{s.time} · {s.title}</option>)}</select><select aria-label="Missions photo ou vidéo" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Photo & vidéo</option><option value="photo">Photo</option><option value="video">Vidéo</option></select></div>
 <div className="subject-tabs" role="group" aria-label="Côté du mariage">{subjects.map(s=><button key={s} aria-pressed={subject===s} onClick={()=>setSubject(s)}>{s}</button>)}</div>
 {next&&<button className="mission-next" onClick={()=>setViewing(next)}><Thumb media={mediaFor(media,next)} className="mission-next-thumb"/><span><small>PROCHAINE MISSION</small><strong>{next.title}</strong></span><ChevronRight size={22}/></button>}
 <div className="mission-content" onPointerDown={e=>{if((e.target as Element).closest('input,select,video,.quick-status'))return;swipe.current={x:e.clientX,y:e.clientY};}} onPointerCancel={()=>{swipe.current=null;}} onPointerUp={e=>{const start=swipe.current;swipe.current=null;if(!start)return;const dx=e.clientX-start.x;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(e.clientY-start.y)*1.5){const n=subjects.indexOf(subject)+(dx<0?1:-1);if(subjects[n]){setSubject(subjects[n]);const block=(event:MouseEvent)=>{event.preventDefault();event.stopPropagation();};document.addEventListener('click',block,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',block,true),300);}}}}>
 {displayStages.map(s=>{const own=list.filter(i=>s?i.stageId===s.id:!stages.some(t=>t.id===i.stageId));if(!own.length&&!s)return null;const travel=s&&legs.find(l=>l.to.id===s.id);return <section key={s?.id||'other'} className="mission-section"><div className="mission-section-head"><div><small>{String(s?.time||'À planifier')}</small><h3>{s?.title||'Autres missions'}</h3></div>{s&&<button className="btn small" aria-label={`Ouvrir ${s.title}`} onClick={()=>navigate('/etape/'+s.id)}>{own.filter(done).length}/{own.length}<ChevronRight size={16}/></button>}</div><>{travel&&<button className="mission-travel" onClick={()=>navigate("/trajets")}>Trajet depuis {travel.from.title} · départ {travelClock(travel.depart)}{travel.conflict>0?" · conflit horaire":""}<ChevronRight size={15}/></button>}</><div className="insp-grid">{own.map(i=><div key={i.id}><MediaCard item={i} thumb={mediaFor(media,i)} operator={operators.get(String(i.operatorId))} icon={i.module==='poses'?<Camera/>:<Clapperboard/>} onView={()=>setViewing(i)} onEdit={()=>setEditing(i)}/><QuickStatus item={i}/></div>)}</div>{!own.length&&<p className="muted">Aucune mission dans cette sélection.</p>}<button className="btn small mission-add" onClick={()=>setEditing(makeItem(kind==='photo'?'poses':'shots','',{stageId:s?.id,subjectGroup:subject==='Tous'?'Ensemble':subject,order:p.items.length}))}><Plus size={15}/> Ajouter une mission</button></section>;})}
 {!list.length&&!stages.length&&<button className="btn gold" onClick={()=>navigate('/deroule')}>Préparer le déroulé</button>}
 </div>
 {viewing?.module==='poses'&&<PoseViewer ids={list.filter(i=>i.module==='poses').map(i=>i.id)} start={list.filter(i=>i.module==='poses').findIndex(i=>i.id===viewing.id)} onClose={()=>setViewing(null)} onEdit={setEditing}/>}
 {viewing?.module==='shots'&&<ShotViewer ids={list.filter(i=>i.module==='shots').map(i=>i.id)} start={list.filter(i=>i.module==='shots').findIndex(i=>i.id===viewing.id)} onClose={()=>setViewing(null)}/>}
 {editing&&<ItemEditor key={editing.id} item={editing} onClose={()=>setEditing(null)}/>}
 </Screen>;
}
