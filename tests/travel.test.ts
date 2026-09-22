import {describe,it,expect} from 'vitest';
import {newProject,makeItem} from '../src/model';
import {travelLegs,travelClock} from '../src/travel';
const setup=()=>{const p=newProject('Test');p.items=[makeItem('stages','Préparatifs',{time:'11:00',duration:90,order:0}),makeItem('stages','Cérémonie religieuse',{time:'14:00',order:1,travelMinutes:35,setupMinutes:40,bufferMinutes:15,packMinutes:10})];return p;};
describe('déplacements dans le déroulé',()=>{
 it('calcule fin des prises, départ, arrivée et conflit',()=>{const l=travelLegs(setup())[0];expect(l.depart).toBe(750);expect(l.finish).toBe(740);expect(l.arrive).toBe(800);expect(l.conflict).toBe(10);});
 it('ne prétend pas connaître un trajet non renseigné',()=>{const p=setup();delete p.items[1].travelMinutes;expect(travelLegs(p)[0].depart).toBeNull();});
 it('gère le passage à minuit dans l’ordre prévu',()=>{const p=setup();p.items[0].time='23:00';p.items[1].time='01:00';expect(travelLegs(p)[0].starts).toBe(1500);expect(travelClock(1500)).toBe('01:00 (J+1)');expect(travelClock(-20)).toBe('23:40 (J-1)');});
 it('une adresse changée invalide la provenance Google',()=>{const p=setup();p.items[1].travelSource='Google Maps';p.items[1].travelKey='ancienne';const l=travelLegs(p)[0];expect(l.stale).toBe(true);expect(l.source).toBe('Manuelle');});
});
