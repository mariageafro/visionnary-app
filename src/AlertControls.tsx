import { useEffect, useRef, useState } from 'react';
import { BellRing, Check, Volume2 } from 'lucide-react';
import type { Project } from './types';
import { fieldAlerts, type FieldAlert } from './fieldAlerts';
import { useProject } from './store';
import { navigate } from './ui';
let audio:AudioContext|undefined;
export async function unlockAlertAudio(){try{audio??=new AudioContext();await audio.resume();}catch{/* Notifications visuelles disponibles sans audio. */}}
function sound(){if(!audio||audio.state!=='running')return;const osc=audio.createOscillator();const gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.value=880;gain.gain.setValueAtTime(.08,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.35);osc.start();osc.stop(audio.currentTime+.35);}
function signal(p:Project,title:string){
 if(p.alerts?.vibration)navigator.vibrate?.([180,100,180]);
 if(p.alerts?.sound)sound();
 if(p.alerts?.notifications&&'Notification'in window&&Notification.permission==='granted'){try{new Notification('Visionnary · Jour J',{body:title,tag:'visionnary-field'});}catch{/* Certains mobiles demandent un service worker. */}}
}
export function FieldAlertRunner({project}:{project?:Project}){
 const [pending,setPending]=useState<FieldAlert[]>([]);const current=useRef(project);current.current=project;
 const seen=useRef(new Set<string>());
 useEffect(()=>{setPending([]);try{seen.current=new Set(JSON.parse(sessionStorage.getItem('visionnary-alert-seen')||'[]'));}catch{seen.current=new Set();}},[project?.id,project?.alerts?.enabled]);
 useEffect(()=>{
  const tick=()=>{const p=current.current;if(!p?.alerts?.enabled)return;const fresh=fieldAlerts(p,Date.now()).filter(a=>!seen.current.has(a.id));if(!fresh.length)return;for(const a of fresh)seen.current.add(a.id);try{sessionStorage.setItem('visionnary-alert-seen',JSON.stringify([...seen.current].slice(-500)));}catch{}setPending(old=>[...fresh,...old].slice(0,8));signal(p,fresh[0].title);};
  tick();const timer=setInterval(tick,10000);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick);};
 },[]);
 if(!project?.alerts?.enabled||!pending.length)return null;
 return <aside className={'field-alert-banner'+(pending[0].priority==='CRITIQUE'?' is-critical':'')} role="alert"><BellRing size={22}/><div>{pending[0].priority==='CRITIQUE'&&<small className="alert-critical-label">RAPPEL CRITIQUE</small>}<strong>{pending[0].title}</strong>{pending.length>1&&<small>{pending.length-1} autre(s) rappel(s)</small>}<button onClick={()=>{const id=pending[0].stageId;if(id)navigate('/etape/'+id);}}>Voir la mission</button></div><button className="icon-btn" aria-label="Acquitter le rappel" onClick={()=>setPending(v=>v.slice(1))}><Check size={22}/></button></aside>;
}
export default function AlertSettings(){
 const {project:p,update,notify}=useProject();const settings=p.alerts??{enabled:false,sound:false,vibration:true,notifications:false,thresholds:[20,10,5]};
 const [permission,setPermission]=useState('Notification'in window?Notification.permission:'unsupported');
 const patch=(v:Partial<typeof settings>)=>update({...p,alerts:{...settings,...v}});
 async function enable(){await unlockAlertAudio();patch({enabled:!settings.enabled});}
 return <section className="card alert-settings"><div className="section-title"><span><BellRing size={17}/> Alertes terrain</span><button className={'btn small'+(settings.enabled?' gold':'')} aria-pressed={settings.enabled} onClick={()=>void enable()}>{settings.enabled?'Activées':'Activer'}</button></div>
 <p className="muted">Fin des étapes et départs : 20, 10 et 5 minutes avant, puis à l’heure prévue. Les rappels personnalisés restent disponibles ci-dessous.</p>
 <div className="alert-choices">{[20,10,5].map(t=><label key={t}><input type="checkbox" checked={settings.thresholds.includes(t)} onChange={e=>patch({thresholds:e.target.checked?[...settings.thresholds,t]:settings.thresholds.filter(n=>n!==t)})}/>{t} min</label>)}<label><input type="checkbox" checked={settings.sound} onChange={e=>{void unlockAlertAudio();patch({sound:e.target.checked});}}/>Son</label><label><input type="checkbox" checked={settings.vibration} disabled={!('vibrate'in navigator)} onChange={e=>patch({vibration:e.target.checked})}/>Vibration{!('vibrate'in navigator)?' non disponible ici':''}</label></div>
 <div className="btn-row"><button className="btn small" onClick={async()=>{await unlockAlertAudio();signal({...p,alerts:settings},'Test des alertes');notify('Test visuel déclenché. Son et vibration selon vos réglages et l’appareil.');}}><Volume2 size={16}/> Tester</button>{permission!=='unsupported'&&<button className="btn small" onClick={async()=>{if(permission==='granted'){patch({notifications:!settings.notifications});return;}try{const result=await Notification.requestPermission();setPermission(result);patch({notifications:result==='granted'});}catch{setPermission('denied');}}}>Notifications : {permission==='granted'?(settings.notifications?'activées':'désactivées'):permission==='denied'?'bloquées':'autoriser'}</button>}</div>
 <p className="muted">Gardez l’application ouverte sur le terrain. Écran verrouillé ou navigateur suspendu : les alertes ne sont pas garanties. La vibration dépend du navigateur ; iPhone peut ne pas la proposer.</p>
 </section>;
}
