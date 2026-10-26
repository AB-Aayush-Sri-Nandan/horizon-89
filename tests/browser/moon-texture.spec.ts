import {test,expect} from './fixtures.ts';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const provenance=JSON.parse(readFileSync(new URL('../../public/textures/provenance.json',import.meta.url),'utf8'));

// Read the actual already-loaded R3F scene through its existing debug root; no production test hook.
async function sceneInfo(page: import('@playwright/test').Page) {
  return page.evaluate(async () => {
    const url=performance.getEntriesByType('resource').map(r=>r.name).find(name=>name.includes('/@react-three_fiber.js'));
    if(!url)throw new Error('Loaded R3F module not found');
    const module=await import(url);
    const state=module._roots.get(document.querySelector('canvas')).store.getState();
    let moon: any=null;
    state.scene.traverse((object: any)=>{if(object.isMesh&&object.geometry?.type==='SphereGeometry'&&object.geometry.parameters.radius===1&&object.material.type==='MeshStandardMaterial')moon=object;});
    if(!moon)throw new Error('Moon mesh not found');
    const texture=moon.material.map;
    return {camera:state.camera.position.toArray() as number[],map:texture?{width:texture.image.naturalWidth,height:texture.image.naturalHeight,flipY:texture.flipY,wrapS:texture.wrapS,wrapT:texture.wrapT,colorSpace:texture.colorSpace}:null,
      bump:moon.material.bumpMap!==null,displacement:moon.material.displacementMap!==null};
  });
}

test('real PNG loads, textured globe renders, and orbit/zoom remain usable',async({page,request},testInfo)=>{
  test.setTimeout(60_000);
  const response=await request.get('/textures/moon-lro.png');
  expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('image/png');
  const bytes=await response.body();expect(createHash('sha256').update(bytes).digest('hex')).toBe(provenance.runtimeAsset.sha256);
  const consoleErrors:string[]=[];page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  const broken:string[]=[];page.on('response',r=>{if(r.url().includes('/textures/')&&r.status()>=400)broken.push(r.url());});
  await page.setViewportSize({width:1600,height:1000});
  await page.goto('/');await page.getByRole('button',{name:'SKIP',exact:true}).click();
  await expect(page.getByText('LROC MORPHOLOGY IMAGERY',{exact:true})).toBeVisible();
  await page.getByLabel('LAT',{exact:true}).fill('0');await page.getByLabel('LON',{exact:true}).fill('0');
  await page.getByRole('button',{name:'APPLY TARGET'}).click();
  await expect.poll(async()=>{const s=await sceneInfo(page);return Math.hypot(s.camera[0]-3.4,s.camera[1],s.camera[2]);}).toBeLessThan(0.011);
  const before=await sceneInfo(page);
  expect(before.map).toEqual({width:2880,height:1440,flipY:true,wrapS:1000,wrapT:1001,colorSpace:'srgb'});
  expect(before.bump).toBe(false);expect(before.displacement).toBe(false);
  await page.evaluate(()=>{
    const caption=document.createElement('div');caption.id='visual-evidence-caption';
    caption.textContent='VISUAL TEST — TELEMETRY USES CONTROLLED FIXTURES';
    Object.assign(caption.style,{position:'fixed',bottom:'8px',left:'30%',padding:'5px 10px',background:'#111',color:'#fff',zIndex:'99999',font:'12px monospace',pointerEvents:'none'});
    document.body.append(caption);
  });
  await page.screenshot({path:testInfo.outputPath('moon-nearside.png')});
  const box=await page.locator('canvas').boundingBox();expect(box).not.toBeNull();
  await page.mouse.move(box!.x+box!.width*0.45,box!.y+box!.height*0.4);await page.mouse.down();
  await page.mouse.move(box!.x+box!.width*0.65,box!.y+box!.height*0.45,{steps:10});await page.mouse.up();
  await expect.poll(async()=>{const s=await sceneInfo(page);return Math.hypot(...s.camera.map((v,i)=>v-before.camera[i]));}).toBeGreaterThan(0.05);
  const radius=Math.hypot(...(await sceneInfo(page)).camera);
  await page.mouse.wheel(0,140);
  await expect.poll(async()=>Math.abs(Math.hypot(...(await sceneInfo(page)).camera)-radius)).toBeGreaterThan(0.02);
  await expect(page.getByText('DRAG TO ROTATE · SCROLL TO ZOOM')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'APPLY TARGET'})).toBeEnabled();
  expect(broken).toEqual([]);
  // Start each landmark view from the existing initial camera, not an antipodal flight.
  await page.reload();await page.getByRole('button',{name:'SKIP',exact:true}).click();
  await expect(page.getByText('LROC MORPHOLOGY IMAGERY',{exact:true})).toBeVisible();
  await page.getByLabel('LAT',{exact:true}).fill('0');await page.getByLabel('LON',{exact:true}).fill('180');
  await page.getByRole('button',{name:'APPLY TARGET'}).click();
  await expect.poll(async()=>{const s=await sceneInfo(page);return Math.hypot(s.camera[0]+3.4,s.camera[1],s.camera[2]);}).toBeLessThan(0.011);
  await page.evaluate(()=>{
    const caption=document.createElement('div');caption.id='visual-evidence-caption';
    caption.textContent='VISUAL TEST — TELEMETRY USES CONTROLLED FIXTURES';
    Object.assign(caption.style,{position:'fixed',bottom:'8px',left:'30%',padding:'5px 10px',background:'#111',color:'#fff',zIndex:'99999',font:'12px monospace',pointerEvents:'none'});
    document.body.append(caption);
  });
  await page.screenshot({path:testInfo.outputPath('moon-farside-app-lighting.png')});
  // Inspect the dark-side seam using a clearly marked TEST-ONLY fill light. Production lighting is unchanged.
  await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').map(r=>r.name).find(n=>n.includes('/@react-three_fiber.js'))!;
    const module=await import(url);const state=module._roots.get(document.querySelector('canvas')).store.getState();
    state.scene.traverse((object:any)=>{if(object.isAmbientLight)object.intensity=2;});
    document.getElementById('visual-evidence-caption')!.textContent='VISUAL TEST — TEMPORARY INSPECTION FILL; TELEMETRY IS FIXTURE DATA';
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  });
  await page.screenshot({path:testInfo.outputPath('moon-farside-seam-inspection.png')});
  expect(broken).toEqual([]);expect(consoleErrors).toEqual([]);
});

test('decode failure with HTTP200 uses neutral sphere without claiming imagery',async({page},testInfo)=>{
  await page.route('**/textures/moon-lro.png',r=>r.fulfill({status:200,contentType:'image/png',body:'invalid PNG (controlled decode failure)'}));
  await page.goto('/');await page.getByRole('button',{name:'SKIP',exact:true}).click();
  await expect(page.getByText('REFERENCE SPHERE · IMAGERY UNAVAILABLE')).toBeVisible();
  expect((await sceneInfo(page)).map).toBeNull();
  await expect(page.getByText('LROC MORPHOLOGY IMAGERY',{exact:true})).toHaveCount(0);
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('moon-neutral-fallback.png')});
});
