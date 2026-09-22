import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { useStore } from '../store';
import { buildWeddingDemo } from '../weddingDemo';
import { mediaChanged, navigate } from '../ui';
export default function DemoButton(){
 const store=useStore();const latest=useRef(store);latest.current=store;
 const [busy,setBusy]=useState('');const lock=useRef(false);
 async function load(){if(lock.current)return;lock.current=true;setBusy('Préparation…');
 try{const p=await buildWeddingDemo(setBusy);const s=latest.current;s.change({...s.w,projects:[...s.w.projects,p],activeProjectId:p.id},'Démo ajoutée · entièrement modifiable');mediaChanged();navigate('/accueil');}catch(e){latest.current.notify(e instanceof Error?e.message:'Impossible de charger la démo');}finally{lock.current=false;setBusy('');}}
 return <button className="btn full" disabled={!!busy} onClick={()=>void load()}><Play size={17}/>{busy||'Explorer le mariage de démonstration'}</button>;
}
