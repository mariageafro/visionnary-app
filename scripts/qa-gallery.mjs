import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage();page.setDefaultTimeout(12000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
await page.goto('http://127.0.0.1:4730');
await page.evaluate(async()=>{const {newProject,makeItem}=await import('/src/model.ts');const {emptyWorkspace}=await import('/src/store.tsx');const {saveWorkspace}=await import('/src/storage.ts');const p=newProject('Démo visuelle · Mariage');p.items=[makeItem('team','Chloé',{id:'chloe'}),makeItem('stages','Préparatifs',{id:'prep',time:'09:00'})];await saveWorkspace({...emptyWorkspace(),projects:[p],activeProjectId:p.id});});
await page.reload();await page.evaluate(()=>location.hash='/m/shots');
await page.locator('.shot-toolbar input[type=file]').setInputFiles(['test-media/licensed/couple-bouquet.jpg','test-media/licensed/portrait-maries.jpg','test-media/licensed/reference-animee.mp4']);
await page.getByRole('dialog').getByRole('button',{name:'Importer',exact:true}).click();
await page.waitForFunction(()=>document.querySelectorAll('.insp-thumb img.is-loaded').length===3);
await page.getByRole('button',{name:'Animer',exact:true}).click();
await page.locator('.insp-thumb video').scrollIntoViewIfNeeded();
await page.waitForFunction(()=>{const v=document.querySelector('.insp-thumb video');return v && v.currentTime>0 && !v.paused;});
await page.getByRole('button',{name:'Figer',exact:true}).click();
await page.waitForFunction(()=>!document.querySelector('.insp-thumb video'));
await page.locator('.insp-media').first().click();
await page.getByRole('dialog').waitFor();
await page.keyboard.press('Escape');
await page.locator('.shot-filter-panel summary').click();
await page.getByLabel('Cadreur',{exact:true}).selectOption('unassigned');
await page.getByText('3 plans affichés sur 3',{exact:true}).waitFor();
await page.getByPlaceholder('Plan, cadrage, étape, cadreur…').fill('inexistant');
await page.getByRole('button',{name:'Effacer les filtres',exact:true}).click();
await page.getByText('3 plans affichés sur 3',{exact:true}).waitFor();
await page.locator('.shot-filter-panel summary').click();
await page.locator('.import-progress').waitFor({state:'hidden'});
for(const width of [375,768,1440]){await page.setViewportSize({width,height:950});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Débordement '+width);await page.screenshot({path:`/tmp/visionnary-gallery-${width}.png`,fullPage:true});}
await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'Animer',exact:true}).click();if(await page.locator('.insp-thumb video').count())throw Error('Mouvement réduit ignoré');
const bytes=await page.evaluate(async()=>{const {loadWorkspace,listMedia}=await import('/src/storage.ts');const {workspaceArchive,importWorkspace}=await import('/src/exports.ts');const w=await loadWorkspace();const blob=await workspaceArchive(w);await importWorkspace(new File([blob],'demo.zip',{type:'application/zip'}));if((await listMedia()).length!==3)throw Error('Médias non restaurés');return [...new Uint8Array(await blob.arrayBuffer())];});
await writeFile('test-media/licensed/demo-visionnary.zip',Buffer.from(bytes));
await page.reload();await page.evaluate(()=>location.hash='/m/shots');await page.waitForFunction(()=>document.querySelectorAll('.insp-thumb img.is-loaded').length===3);
if(errors.length)throw Error(errors.join('\n'));
console.log('OK : import réel 3 médias, lecture/pause, fiche, filtres, responsive, mouvement réduit, ZIP/restauration et rechargement.');
} finally {await browser.close();}
