import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(12000);
try {
await page.goto('http://127.0.0.1:4730');
const ids=await page.evaluate(async()=>{const {newProject}=await import('/src/model.ts');const {emptyWorkspace}=await import('/src/store.tsx');const {saveWorkspace}=await import('/src/storage.ts');const {sceneTemplates}=await import('/src/scene/templates.ts');const p=newProject('Test gestes');const plan=sceneTemplates[0].build();p.scenePlans=[plan];await saveWorkspace({...emptyWorkspace(),projects:[p],activeProjectId:p.id});return {plan:plan.id,camera:plan.elements.find(e=>e.kind==='camera').id};});
await page.reload();await page.evaluate(id=>location.hash='/scene/'+id,ids.plan);await page.locator('.sd-svg').waitFor();
const data=()=>page.evaluate(async()=>JSON.stringify((await (await import('/src/storage.ts')).loadWorkspace()).projects[0].scenePlans[0].elements));
const before=await data();
await page.getByRole('button',{name:'Déplacer la vue',exact:true}).click();
const camera=page.locator(`.sd-cam[data-id="${ids.camera}"]`);const box=await camera.boundingBox();const svg=page.locator('.sd-svg');const old=await svg.getAttribute('viewBox');
await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+60,box.y+box.height/2+40,{steps:8});await page.mouse.up();
if(await svg.getAttribute('viewBox')===old)throw Error('Vue immobile');if(await data()!==before)throw Error('Éléments modifiés en mode main');
await page.getByRole('button',{name:'Sélection',exact:true}).click();
const box2=await camera.boundingBox();const x=box2.x+box2.width/2,y=box2.y+box2.height/2;
await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+40,y+20,{steps:5});await svg.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',clientX:x+40,clientY:y+20,bubbles:true});await page.mouse.up();
if(await data()!==before)throw Error('Geste annulé enregistré');
await page.setViewportSize({width:375,height:850});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Débordement mobile');await page.screenshot({path:'/tmp/visionnary-scene-mobile.png'});
console.log('OK : déplacement de vue sur caméra sans mutation, annulation de glisser, responsive 375 px.');
}finally{await browser.close();}
