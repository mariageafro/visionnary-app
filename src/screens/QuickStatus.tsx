import { Check, EyeOff, RotateCcw } from 'lucide-react';
import type { Item } from '../types';
import { done } from '../model';
import { useProject } from '../store';
export default function QuickStatus({item}:{item:Item}) {
 const {patchItem}=useProject();
 const hidden = item.status === 'archivé';
 return <div className="quick-status" aria-label={`Actions : ${item.title}`}>
   <button aria-pressed={done(item)} aria-label={`Fait : ${item.title}`} onClick={()=>patchItem(item.id,{status:done(item)?'prévu':'terminé'},done(item)?'Mission remise à faire':'Mission réalisée')}><Check size={17}/><span>Fait</span></button>
   <button aria-pressed={item.status==='à refaire'} aria-label={`À refaire : ${item.title}`} onClick={()=>patchItem(item.id,{status:'à refaire'},'Mission à refaire')}><RotateCcw size={15}/><span>À refaire</span></button>
   <button aria-pressed={hidden} aria-label={hidden ? `Réafficher : ${item.title}` : `Masquer : ${item.title}`} title={hidden ? "Réafficher (redevient visible dans « Toutes »)" : "Masquer sans supprimer la photo — utile pour cacher les références d'un modèle et laisser la place aux nouvelles photos"} onClick={()=>patchItem(item.id,{status: hidden ? 'prévu' : 'archivé'}, hidden ? 'Réaffiché' : 'Masqué · toujours récupérable')}><EyeOff size={15}/></button>
 </div>;
}
