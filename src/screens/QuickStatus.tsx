import { Check, RotateCcw, Trash2 } from 'lucide-react';
import type { Item } from '../types';
import { done } from '../model';
import { useProject } from '../store';
export default function QuickStatus({item}:{item:Item}) {
 const {patchItem}=useProject();
 return <div className="quick-status" aria-label={`Actions : ${item.title}`}>
   <button aria-pressed={done(item)} aria-label={`Fait : ${item.title}`} onClick={()=>patchItem(item.id,{status:done(item)?'prévu':'terminé'},done(item)?'Mission remise à faire':'Mission réalisée')}><Check size={17}/><span>Fait</span></button>
   <button aria-pressed={item.status==='à refaire'} aria-label={`À refaire : ${item.title}`} onClick={()=>patchItem(item.id,{status:'à refaire'},'Mission à refaire')}><RotateCcw size={15}/><span>À refaire</span></button>
   <button aria-label={`Retirer : ${item.title}`} title="Retirer de la liste (annulable)" onClick={()=>patchItem(item.id,{status:'archivé'},'Mission retirée · annulation disponible')}><Trash2 size={15}/></button>
 </div>;
}
