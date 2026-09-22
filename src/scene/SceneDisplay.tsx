import { Eye } from 'lucide-react';
export interface SceneDisplayOptions { grid:boolean; decor:boolean; cones:boolean; labels:boolean }
export const cleanScene:SceneDisplayOptions={grid:false,decor:false,cones:false,labels:false};
export default function SceneDisplay({value,onChange}:{value:SceneDisplayOptions;onChange:(v:SceneDisplayOptions)=>void}){
 return <details className="sd-display"><summary><Eye size={16}/> Affichage</summary><div>{([['grid','Quadrillage'],['decor','Décor et invités'],['cones','Champs des caméras'],['labels','Détails et légendes']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={value[key]} onChange={e=>onChange({...value,[key]:e.target.checked})}/>{label}</label>)}</div></details>;
}
