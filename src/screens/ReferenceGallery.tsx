import { useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Crop, ImagePlus, RotateCcw, Star, Unlink } from 'lucide-react';
import type { Item, MediaEntry } from '../types';
import { useProject } from '../store';
import { importMedia } from '../media';
import { putMedia } from '../storage';
import { mediaChanged, Thumb } from '../ui';
import { mediaFor, VideoPreview } from './common';
import { detachMany, detachFromSeries, doneAngles, seriesMedia, toggleAngle, viewStyle } from '../merge';
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
  const [crop, setCrop] = useState(false);
  const [outMode, setOutMode] = useState(false);
  const [out, setOut] = useState<string[]>([]);
  const [draft, setDraft] = useState<{ id: string; z: number; x: number; y: number } | null>(null);
  const pan = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
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
  const view = current ? (draft && draft.id === current.id ? { z: draft.z, x: draft.x, y: draft.y } : current.view ?? { z: 1, x: 50, y: 50 }) : { z: 1, x: 50, y: 50 };
  const saveView = async (v: { z: number; x: number; y: number }) => {
    if (!current) return;
    try { await putMedia({ ...current, view: v.z > 1 ? v : undefined }); mediaChanged(); } catch { notify('Impossible d’enregistrer le cadrage'); }
    setDraft(null);
  };
  const releaseOwners = (mediaIds: string[]) => {
    const owners = [...new Set(gallery.filter(m => mediaIds.includes(m.id) && m.itemId !== item.id).map(m => m.itemId))];
    if (!owners.length) return;
    update({ ...project, items: detachMany(project.items, item.id, owners) }, owners.length > 1 ? `${owners.length} angles sortis de la série` : 'Angle sorti de la série : il redevient une pose à part');
    setOut([]); setOutMode(false); setSelected('');
  };
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
      onPointerDown={e=>{e.stopPropagation();if((e.target as Element).closest('button,video,input'))return;if(crop&&current&&view.z>1){pan.current={px:e.clientX,py:e.clientY,x:view.x,y:view.y};(e.currentTarget as Element).setPointerCapture?.(e.pointerId);return;}swipe.current={x:e.clientX,y:e.clientY};}}
      onPointerMove={e=>{const g=pan.current;if(!g||!current)return;const box=e.currentTarget.getBoundingClientRect();setDraft({id:current.id,z:view.z,x:Math.max(0,Math.min(100,g.x-(e.clientX-g.px)/box.width*100/view.z*1.6)),y:Math.max(0,Math.min(100,g.y-(e.clientY-g.py)/box.height*100/view.z*1.6))});}}
      onPointerCancel={()=>{swipe.current=null;}}
      onPointerUp={e=>{e.stopPropagation();if(pan.current){pan.current=null;void saveView(view);return;}const start=swipe.current;swipe.current=null;if(!start)return;const dx=e.clientX-start.x;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(e.clientY-start.y)*1.5)go(dx<0?1:-1);}}>
      {current ? current.type.startsWith('video/') ? <div className="reference-zoom" style={viewStyle({...current,view})}><VideoPreview key={current.id} media={current} className="reference-video" loop /></div> : <div className="reference-zoom" style={viewStyle({...current,view})}><Thumb media={current} className="reference-photo" full /></div> : <div className="reference-empty"><ImagePlus size={36}/><p>Ajoutez la pose, puis ses différents angles.</p></div>}
      {index>0&&<button className="reference-arrow prev" aria-label="Angle précédent" onClick={()=>go(-1)}><ChevronLeft/></button>}
      {index<gallery.length-1&&<button className="reference-arrow next" aria-label="Angle suivant" onClick={()=>go(1)}><ChevronRight/></button>}
      {current&&<span className="reference-count">Angle {index+1} / {gallery.length}{gallery.length>1?` · ${takenCount} pris`:''}</span>}
      {current&&taken.has(current.id)&&<span className="reference-taken"><Check size={14}/> Pris</span>}
    </div>
    {gallery.length>1&&<div className="reference-strip">{gallery.map((m,n)=><button key={m.id} data-reorder={m.id} style={{touchAction:'none'}} onPointerDown={e=>{if(gallery.length>1)dragAngle(e,m.id);}} aria-label={`Voir l’angle ${n+1}`} aria-pressed={m.id===current?.id} className={(taken.has(m.id)?'is-taken ':'')+(out.includes(m.id)?'is-out':'')} onClick={()=>{if(outMode&&m.itemId!==item.id)setOut(o=>o.includes(m.id)?o.filter(x=>x!==m.id):[...o,m.id]);else setSelected(m.id);}}><Thumb media={m}/><span role="button" aria-label={taken.has(m.id)?`Angle ${n+1} pris`:`Marquer l’angle ${n+1} pris`} className={'reference-tick'+(taken.has(m.id)?' on':'')} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();update({...project,items:project.items.map(i=>i.id===item.id?toggleAngle(i,m.id,gallery.length):i)},taken.has(m.id)?'Angle remis à faire':'Angle pris');}}><Check size={12}/></span></button>)}</div>}
    {current&&<div className="reference-crop">
      <button className={'btn small'+(crop?' gold':'')} aria-pressed={crop} onClick={()=>setCrop(!crop)}><Crop size={14}/> Zoom / recadrer</button>
      {crop&&<><input type="range" min="1" max="4" step="0.05" aria-label="Zoom" value={view.z} onChange={e=>setDraft({id:current.id,z:Number(e.target.value),x:view.x,y:view.y})} onPointerUp={()=>void saveView(view)} onKeyUp={()=>void saveView(view)}/><span className="muted">×{view.z.toFixed(1)} · glissez l’image pour la cadrer</span><button className="btn small" onClick={()=>void saveView({z:1,x:50,y:50})}><RotateCcw size={14}/> Rétablir</button></>}
    </div>}
    {gallery.some(m=>m.itemId!==item.id)&&<div className="reference-crop">
      <button className={'btn small'+(outMode?' gold':'')} aria-pressed={outMode} onClick={()=>{setOutMode(!outMode);setOut([]);}}><Unlink size={14}/> Sortir des angles</button>
      {outMode&&<><span className="muted">Touchez les angles à sortir de la série</span>
        <button className="btn small gold" disabled={!out.length} onClick={()=>releaseOwners(out)}>Sortir la sélection ({out.length})</button>
        <button className="btn small" onClick={()=>releaseOwners(gallery.map(m=>m.id))}>Tout sortir</button></>}
    </div>}
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
