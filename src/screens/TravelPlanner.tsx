import { useState } from 'react';
import { Car, ExternalLink, Settings } from 'lucide-react';
import { useProject } from '../store';
import { Screen, navigate } from '../ui';
import { departureISO, travelClock, travelKey, travelLegs } from '../travel';
import './travel.css';
export default function TravelPlanner(){
 const {project:p,patchItem,notify}=useProject();const [busy,setBusy]=useState('');const legs=travelLegs(p);
 async function estimate(leg:ReturnType<typeof travelLegs>[number]){
  const departureTime=departureISO(p.date,leg.depart??(leg.starts===null?null:leg.starts-leg.setup-leg.buffer-30));
  if(!departureTime||Date.parse(departureTime)<=Date.now()){notify('Choisissez une date et un horaire futurs pour estimer le trafic.');return;}
  if(!leg.origin||!leg.destination){notify('Renseignez les deux adresses.');return;}
  setBusy(leg.to.id);
  try{const response=await fetch('/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:leg.origin,destination:leg.destination,departureTime})});if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Service de trajet indisponible. Renseignez la durée manuellement en attendant la configuration Google.');const data=await response.json();if(!response.ok)throw Error(data.error||'Estimation indisponible');patchItem(leg.to.id,{travelMinutes:data.minutes,travelSource:'Google Maps',travelCheckedAt:new Date().toISOString(),travelDeparture:departureTime,travelKey:travelKey(leg.origin,leg.destination,p.date)},'Trajet estimé avec Google Maps');}
  catch(e){notify(e instanceof Error?e.message:'Connexion au service indisponible. Conservez une durée manuelle.');}
  finally{setBusy('');}
 }
 return <Screen title="Trajets & installation" backTo="/accueil"><p className="muted">Finir les prises, ranger, rouler, installer : votre heure limite de départ se recalcule à chaque changement.</p>
 <details className="travel-help"><summary>Google Maps et trafic</summary><p>Sans connexion Google configurée, saisissez la durée indiquée dans Maps. Les horaires ci-dessous se calculent localement. La marge couvre les aléas ; une estimation ne garantit jamais l’heure d’arrivée.</p><p>Pour activer le calcul : API Routes et clé côté serveur, puis connexion au compte Visionnary. <a href="#/sync">Compte & connexion</a></p></details>
 {!legs.length&&<button className="btn gold" onClick={()=>navigate('/deroule')}>Créer au moins deux étapes dans le déroulé</button>}
 {legs.map(leg=><section className="travel-leg card" key={leg.to.id}><div className="travel-heading"><Car size={21}/><h2>{leg.from.title} → {leg.to.title}</h2></div>
 <div className="travel-addresses"><label className="field">Départ<input key={leg.from.id+leg.origin} defaultValue={leg.origin} placeholder="Adresse des préparatifs" onBlur={e=>{if(e.target.value!==leg.origin)patchItem(leg.to.id,{travelOrigin:e.target.value.trim()});}}/></label><label className="field">Arrivée<input key={leg.to.id+leg.destination} defaultValue={leg.destination} placeholder="Adresse du lieu suivant" onBlur={e=>{if(e.target.value!==leg.destination)patchItem(leg.to.id,{travelDestination:e.target.value.trim()});}}/></label></div>
 <div className="travel-durations">{([['travelMinutes','Route',leg.drive],['setupMinutes','Installation',leg.setup],['bufferMinutes','Marge',leg.buffer],['packMinutes','Rangement',leg.pack]] as const).map(([key,label,value])=><label className="field" key={key}>{label} (min)<input type="number" min="0" max="1440" value={value??''} placeholder="À estimer" onChange={e=>{const v=e.target.value;if(v!==''&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1440))return;patchItem(leg.to.id,{[key]:v===''?'':Number(v),...(key==='travelMinutes'?{travelSource:'Manuelle'}:{})});}}/></label>)}</div>
 <div className="travel-times">{[['Finir les prises',leg.finish],['Partir au plus tard',leg.depart],['Arriver / installer',leg.arrive],['Prêt pour l’étape',leg.starts]].map(([label,value])=><div key={String(label)}><small>{label}</small><strong>{travelClock(value as number|null)}</strong></div>)}</div>
 {leg.conflict>0&&<p className="travel-conflict" role="status">Le programme précédent dépasse l’heure de fin des prises de {leg.conflict} min. Avancez-le, réduisez sa durée ou prévoyez une équipe déjà sur place.</p>}
 <p className="muted">{leg.drive===null?'Durée de trajet à renseigner.':`${leg.source} · ${leg.drive} min de route`}{leg.source==='Google Maps'&&leg.to.travelCheckedAt?` · vérifiée ${new Date(String(leg.to.travelCheckedAt)).toLocaleString('fr-FR')}`:''}{leg.stale?' · estimation à actualiser':''}</p>
 <div className="btn-row"><a className="btn small" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(leg.origin)}&destination=${encodeURIComponent(leg.destination)}&travelmode=driving`}><ExternalLink size={15}/> Vérifier dans Maps</a><button className="btn small" disabled={!!busy} onClick={()=>void estimate(leg)}>{busy===leg.to.id?'Calcul…':'Estimer avec Google'}</button><button className="btn small" onClick={()=>navigate('/deroule')}><Settings size={15}/> Horaires</button></div>
 </section>)}
 </Screen>;
}
