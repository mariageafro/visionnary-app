import {describe,it,expect} from 'vitest';
import {newProject,makeItem} from '../src/model';
import {fieldAlerts} from '../src/fieldAlerts';
const setup=()=>{const p=newProject('Terrain');p.date='2026-10-01';p.alerts={enabled:true,sound:false,vibration:false,notifications:false,thresholds:[20,10,5]};p.items=[makeItem('stages','Portraits',{time:'10:00',duration:60,order:0})];return p;};
const at=(time:string)=>Date.parse('2026-10-01T'+time+':00');
describe('alertes terrain',()=>{
 it('signale les seuils 20, 10, 5 et la fin',()=>{const p=setup();for(const [time,text] of [['10:40','20 min'],['10:50','10 min'],['10:55','5 min'],['11:00','maintenant']])expect(fieldAlerts(p,at(time)).some(a=>a.title.includes(text))).toBe(true);});
 it('ne rejoue pas une ancienne alerte et respecte la désactivation',()=>{const p=setup();expect(fieldAlerts(p,at('10:42'))).toEqual([]);p.alerts!.enabled=false;expect(fieldAlerts(p,at('10:40'))).toEqual([]);});
 it('ignore une étape terminée et suit le démarrage réel',()=>{const p=setup();p.items[0].startedAt=new Date(at('10:15')).toISOString();expect(fieldAlerts(p,at('10:40'))).toEqual([]);expect(fieldAlerts(p,at('10:55')).some(a=>a.title.includes('20 min'))).toBe(true);p.items[0].endedAt=new Date(at('10:56')).toISOString();expect(fieldAlerts(p,at('11:05'))).toEqual([]);});
 it('rappelle le départ avec route, installation et marge',()=>{const p=setup();p.items.push(makeItem('stages','Mairie',{time:'12:30',duration:30,order:1,travelMinutes:20,setupMinutes:25,bufferMinutes:15,packMinutes:10}));expect(fieldAlerts(p,at('11:10')).some(a=>a.title==='Départ vers Mairie : il reste 20 min')).toBe(true);p.items[1].startedAt=new Date(at('11:10')).toISOString();expect(fieldAlerts(p,at('11:10')).some(a=>a.title.startsWith('Départ'))).toBe(false);});
});
