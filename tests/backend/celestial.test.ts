import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import type {AddressInfo} from 'node:net';
import {SpiceClient,parseScienceQuery} from '../../server/spice.ts';
import {createApp} from '../../server/app.ts';
import type {CelestialResponse} from '../../shared/celestial.ts';
const utc='2026-10-10T06:00:00.123Z';

test('celestial query validates one UTC, explicit conventions and bounded target/frame selections',()=>{
  assert.deepEqual(parseScienceQuery({utc,targets:'399,301',frames:'MOON_ME,ITRF93'}),{operation:'state',utc,centre:'SUN',targets:[399,301],frames:['MOON_ME','ITRF93']});
  for(const patch of [{utc:'bad'},{utc:[utc]},{utc:'1960-01-01T00:00:00.000Z'},{centre:'DISPLAY'},{frame:'ECLIPJ2000'},{aberration:'LT+S'},{targets:'399,399'},{targets:'0'},{targets:'399;echo'},{frames:'IAU_MOON'},{frames:'MOON_ME,MOON_ME'},{url:'https://evil.test'}])assert.throws(()=>parseScienceQuery({utc,...patch}));
});
test('real private SPICE worker computes immutable physical vectors with complete kernel provenance',async()=>{
  const client=new SpiceClient();
  try{
    const data=await client.request({operation:'state',utc,centre:'EARTH',targets:[301,499,4],frames:['MOON_PA','MOON_ME','ITRF93']}) as CelestialResponse;
    assert.equal(data.status,'COMPUTED');assert.equal(data.complete,false);
    const moon=data.bodies[0];assert.equal(moon.status,'COMPUTED');
    if(moon.status!=='COMPUTED')throw new Error('Moon computation failed');
    assert.equal(moon.position.units,'km');assert.equal(moon.position.centre,'EARTH');
    assert.ok(Math.hypot(...moon.position.xyz)>300000);assert.ok(Math.hypot(...moon.position.xyz)<450000);
    assert.ok(Object.isFrozen(data));assert.ok(Object.isFrozen(moon.position.xyz));
    assert.throws(()=>{(moon.position.xyz as unknown as number[])[0]=123;});
    assert.equal(data.bodies[1].status,'UNAVAILABLE');assert.ok(!('position' in data.bodies[1]));
    assert.equal(data.orientations.ITRF93.status,'COMPUTED');
    assert.match(data.provenance.kernelSetHash,/^[0-9a-f]{64}$/);assert.equal(data.provenance.provider,'NAIF_SPICE');
    assert.equal(data.provenance.toolkitVersion,'CSPICE_N0067');
  }finally{client.close();}
});
test('concurrent worker requests remain isolated by exact epoch and centre',async()=>{
  const client=new SpiceClient();
  try{
    const requests=Array.from({length:8},(_,i)=>({operation:'state' as const,utc:`2026-10-10T06:00:00.${String(123+i).padStart(3,'0')}Z`,centre:'SSB' as const,targets:[399]}));
    const data=await Promise.all(requests.map(r=>client.request(r))) as CelestialResponse[];
    data.forEach((r,i)=>assert.equal(r.timeUTC,requests[i].utc));
    assert.notDeepEqual(data[0].bodies,data[1].bodies);
  }finally{client.close();}
});
test('worker boot failure is controlled and does not retry-spawn per request',async()=>{
  for(const executable of ['/no-such-python-runtime','']){
    const client=new SpiceClient(executable);
    try{
      for(let i=0;i<2;i++)await assert.rejects(client.request({operation:'capabilities'}),(e:any)=>e.code==='SCIENCE_SERVICE_UNAVAILABLE'&&!e.message.includes('no-such'));
    }finally{client.close();}
  }
});
test('real Express science endpoints work without changing existing health or Horizons response handling',async()=>{
  const client=new SpiceClient();
  const app=createApp({science:client,logger:()=>{}});const server=app.listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
    assert.equal((await fetch(base+'/api/health')).status,200);
    const caps=await (await fetch(base+'/api/science/capabilities')).json();assert.equal(caps.bodies.length,14);assert.equal(caps.frames.length,13);
    const data=await (await fetch(base+'/api/celestial-state?'+new URLSearchParams({utc,targets:'399,499',frames:'ITRF93'}))).json();
    assert.equal(data.status,'COMPUTED');assert.equal(data.bodies[1].status,'UNAVAILABLE');assert.equal(data.reference.aberrationCorrection,'NONE');
    assert.equal((await fetch(base+'/api/celestial-state?utc=bad')).status,400);
    assert.equal((await fetch(base+'/api/science/capabilities?frame=J2000')).status,400);
    const absent=await (await fetch(base+'/api/celestial-state?'+new URLSearchParams({utc,targets:'499'}))).json();
    assert.equal(absent.status,'UNAVAILABLE');assert.ok(!('position' in absent.bodies[0]));
  }finally{client.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('missing science runtime does not prevent existing app liveness',async()=>{
  const client=new SpiceClient('/no-such-runtime');const server=createApp({science:client,logger:()=>{}}).listen(0,'127.0.0.1');await once(server,'listening');
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try{
    const failed=await fetch(base+'/api/science/capabilities');assert.equal(failed.status,503);assert.equal((await failed.json()).status,'UNAVAILABLE');
    assert.equal((await fetch(base+'/api/health')).status,200);
  }finally{client.close();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
