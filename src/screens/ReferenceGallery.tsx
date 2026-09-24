import { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ImagePlus, Star, Unlink } from 'lucide-react';
import type { Item, MediaEntry } from '../types';
import { useProject } from '../store';
import { importMedia } from '../media';
import { putMedia } from '../storage';
import { mediaChanged, Thumb } from '../ui';
import { mediaFor, VideoPreview } from './common';
import { detachFromSeries, doneAngles, seriesMedia, toggleAngle } from '../merge';
import { usePointerReorder } from '../reorder';
import { PickFiles } from './MediaDrop';
import './references.css';

export function referencesFor(media: MediaEntry[], item: Item) {
  const own = seriesMedia(media, item);
  const fallback = mediaFor(media, item);
  const list = own.length ? own : fallback ? [fallback] : [];
  return list;
}

/** Un geste horizontal change l'angle, jamais la mission. */
export default function ReferenceGallery({ item, media }: { item: Item; media: MediaEntry[] }) {
  const { project, patchItem, update, notify } = useProject();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const swipe = useRef<{x:number;y:number}|null>(null);
  const gallery = referencesFor(media,item);
  const index = Math.max(0,gallery.findIndex(m=>m.id===selected));
  const current = gallery[index];
  const taken = doneAngles(item);
  const takenCount = gallery.filter(m => taken.has(m.id)).length;
  const foreign = current && current.itemId !== item.id;
  const dragAngle = usePointerReorder({ onDropTile: (dragged, target, zone) => {
    const ids = gallery.map(m => m.id).filter(id => id !== dragged);
    const at = ids.indexOf(target) + (zone === 'after' ? 1 : 0);
    ids.splice(at, 0, dragged);
    patchItem(item.id, { angleOrder: ids.join(','), coverId: ids[0] }, 'Ordre des angles changé');
  } });
  const go = (step:number) => { const next=gallery[index+step]; if(next)setSelected(next.id); };
  async function upload(files: File[]) {
    if(busy)return;
    setBusy(true);let count=0;
    try { for(const file of files) { const m=await importMedia(file,project.id,item.id); if(!m.unsupported){setSelected(m.id);count++;} } notify(`${count} référence(s) ajoutée(s)`); }
    catch(e){notify(`Import interrompu : ${e instanceof Error ? e.message : String(e)}`);}
    finally { mediaChanged();setBusy(false); }
  }
  return <section className="reference-gallery" aria-label="Angles de référence" onKeyDown={e=>{if((e.target as Element).closest('input'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();e.stopPropagation();go(e.key==='ArrowRight'?1:-1);}}}>
    <div className="reference-image" tabIndex={0}
      onPointerDown={e=>{e.stopPropagation();if((e.target as Element).closest('button,video,input'))return;swipe.current={x:e.clientX,y:e.clientY};}}
      onPointerCancel={()=>{swipe.current=null;}}
      onPointerUp={e=>{e.stopPropagation();const start=swipe.current;swipe.current=null;if(!start)return;const dx=e.clientX-start.x;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(e.clientY-start.y)*1.5)go(dx<0?1:-1);}}>
      {current ? current.type.startsWith('video/') ? <VideoPreview key={current.id} media={current} className="reference-video" loop /> : <Thumb media={current} className="reference-photo" full /> : <div className="reference-empty"><ImagePlus size={36}/><p>Ajoutez la pose, puis ses différents angles.</p></div>}
      {index>0&&<button className="reference-arrow prev" aria-label="Angle précédent" onClick={()=>go(-1)}><ChevronLeft/></button>}
      {index<gallery.length-1&&<button className="reference-arrow next" aria-label="Angle suivant" onClick={()=>go(1)}><ChevronRight/></button>}
      {current&&<span className="reference-count">Angle {index+1} / {gallery.length}{gallery.length>1?` · ${takenCount} pris`:''}</span>}
      {current&&taken.has(current.id)&&<span className="reference-taken"><Check size={14}/> Pris</span>}
    </div>
    {gallery.length>1&&<div className="reference-strip">{gallery.map((m,n)=><button key={m.id} data-reorder={m.id} style={{touchAction:'none'}} onPointerDown={e=>{if(gallery.length>1)dragAngle(e,m.id);}} aria-label={`Voir l’angle ${n+1}`} aria-pressed={m.id===current?.id} className={taken.has(m.id)?'is-taken':''} onClick={()=>setSelected(m.id)}><Thumb media={m}/><span role="button" aria-label={taken.has(m.id)?`Angle ${n+1} pris`:`Marquer l’angle ${n+1} pris`} className={'reference-tick'+(taken.has(m.id)?' on':'')} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();update({...project,items:project.items.map(i=>i.id===item.id?toggleAngle(i,m.id,gallery.length):i)},taken.has(m.id)?'Angle remis à faire':'Angle pris');}}><Check size={12}/></span></button>)}</div>}
    <div className="reference-tools">
      <PickFiles className="btn small" label={busy?'Import…':'Ajouter des angles'} onFiles={files=>void upload(files)}/>
      {current&&<button className={'btn small'+(taken.has(current.id)?' gold':'')} aria-pressed={taken.has(current.id)} onClick={()=>update({...project,items:project.items.map(i=>i.id===item.id?toggleAngle(i,current.id,gallery.length):i)},taken.has(current.id)?'Angle remis à faire':'Angle pris')}><Check size={14}/> {taken.has(current.id)?'Angle pris':'Marquer l’angle pris'}</button>}
      {foreign&&<button className="btn small" onClick={()=>update({...project,items:detachFromSeries(project.items,item.id,current.itemId)},'Angle détaché : il redevient une pose à part')}><Unlink size={14}/> Détacher cet angle</button>}
      {current&&<button className="btn small" aria-pressed={current.id===item.coverId || (!item.coverId&&index===0)} onClick={()=>patchItem(item.id,{coverId:current.id},'Couverture choisie')}><Star size={14}/> Couverture</button>}
    </div>
    {current&&<label className="reference-caption">Angle / cadrage
      <input key={current.id+current.name} defaultValue={current.name} placeholder="Ex. Plongée · plan poitrine · 85 mm" onBlur={async e=>{const name=e.target.value.trim();if(name&&name!==current.name){try{await putMedia({...current,name});mediaChanged();}catch{notify('Impossible d’enregistrer le nom de cet angle');}}}}/>
    </label>}
  </section>;
}
