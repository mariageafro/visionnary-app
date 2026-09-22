import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4730');
 await page.getByRole('button',{name:'Explorer le mariage de démonstration',exact:true}).click();
 await page.getByRole('heading',{name:'Votre journée',exact:true}).waitFor({timeout:60000});
 await page.waitForFunction(()=>document.querySelectorAll('.insp-thumb img.is-loaded').length>2);
 await page.getByRole('button',{name:'Mariée',exact:true}).click();
 await page.getByRole('button',{name:'Fait : Habillage et derniers détails',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[aria-label="Fait : Habillage et derniers détails"]')?.getAttribute('aria-pressed')==='true');
 await page.getByRole('button',{name:'Voir Habillage et derniers détails',exact:true}).click();
 await page.getByRole('region',{name:'Angles de référence'}).waitFor();
 await page.getByRole('button',{name:'Angle suivant',exact:true}).click();
 await page.getByText('Angle 2 / 2',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Couverture',exact:true}).click();
 await page.locator('.reference-tools input[type=file]').setInputFiles('test-media/licensed/portrait-maries.jpg');
 await page.waitForFunction(()=>document.querySelectorAll('.reference-strip button').length===3);
 if(!await page.locator('.reference-caption input').inputValue().then(v=>v.includes('portrait-maries')))throw Error('Nouvelle référence non sélectionnée');
 await page.getByRole('button',{name:'Fermer',exact:true}).click();
 await page.evaluate(()=>location.hash='/m/poses');await page.getByRole('heading',{name:'Galerie photographe',exact:true}).waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.pose-thumb img.is-loaded').length>=6);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.screenshot({path:'/tmp/visionnary-poses-desktop.png',fullPage:false});
 await page.evaluate(()=>location.hash='/trajets');await page.getByRole('heading',{name:'Trajets & installation',exact:true}).waitFor();
 await page.screenshot({path:'/tmp/visionnary-travel-desktop.png',fullPage:true});
 const conflicts=await page.evaluate(async()=>{const w=await (await import('/src/storage.ts')).loadWorkspace();const {travelLegs}=await import('/src/travel.ts');return travelLegs(w.projects.find(p=>p.id===w.activeProjectId)).filter(l=>l.conflict>0).length;});if(conflicts)throw Error('Démo : conflit de déplacement');
 const plan=await page.evaluate(async()=>{const w=await (await import('/src/storage.ts')).loadWorkspace();return w.projects.find(p=>p.id===w.activeProjectId).scenePlans[0].id;});
 await page.evaluate(id=>location.hash='/scene/'+id,plan);await page.locator('.sd-svg').waitFor();
 if(await page.locator('.sd-cone:visible').count())throw Error('Champs visibles en mode épuré');
 await page.locator('.sd-display summary').click();await page.getByLabel('Champs des caméras',{exact:true}).check();if(!await page.locator('.sd-cone:visible').count())throw Error('Champs non réactivés');
 await page.getByRole('button',{name:'Lecture',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).waitFor();await page.getByRole('button',{name:'Pause',exact:true}).click();
 for(const [width,height]of [[375,850],[850,375],[768,1024],[1440,1000]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>location.hash='/accueil');await page.getByRole('heading',{name:'Votre journée',exact:true}).waitFor();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Accueil déborde '+width);
  if(width===375){await page.waitForFunction(()=>document.querySelector('.mission-next img')?.complete&&document.querySelector('.mission-next img')?.naturalWidth>0);await page.screenshot({path:'/tmp/visionnary-mission-mobile.png',fullPage:false});}
  await page.evaluate(()=>location.hash='/m/poses');await page.getByRole('heading',{name:'Galerie photographe',exact:true}).waitFor();
  await page.locator('.pose-media').first().click();await page.getByRole('region',{name:'Angles de référence'}).waitFor();
  if(await page.evaluate(()=>document.querySelector('dialog[open]').scrollWidth>innerWidth))throw Error('Galerie déborde '+width);
  await page.getByRole('button',{name:'Fermer',exact:true}).click();
 }
 await page.evaluate(()=>location.hash='/rappels');
 await page.getByRole('button',{name:'Activer',exact:true}).click();
 await page.getByRole('button',{name:'Activées',exact:true}).waitFor();
 const demoDate=await page.evaluate(async()=>{const w=await (await import('/src/storage.ts')).loadWorkspace();return w.projects.find(p=>p.id===w.activeProjectId).date;});
 await page.clock.install({time:new Date(demoDate+'T09:39:50')});
 await page.clock.fastForward(20000);
 await page.getByRole('alert').filter({hasText:'Fin de Préparatifs : il reste 20 min'}).waitFor();
 while(await page.locator('.field-alert-banner').count())await page.getByRole('button',{name:'Acquitter le rappel',exact:true}).click();
 await page.clock.fastForward(10000);
 if(await page.locator('.field-alert-banner').count())throw Error('Rappel répété après acquittement: '+await page.locator('.field-alert-banner').innerText());
 await page.reload();
 await page.getByRole('button',{name:'Activées',exact:true}).waitFor();
 if(await page.locator('.field-alert-banner').count())throw Error('Rappel rejoué après rechargement');
 if(errors.length)throw Error(errors.join('\n'));console.log('OK : démo, accueil, statut immédiat, angles, couverture, import, galerie, trajets, scène épurée/complète et lecture, alertes sans répétition, persistance, 4 formats.');
}finally{await browser.close();}
