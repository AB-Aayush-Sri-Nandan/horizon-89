import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {SphereGeometry} from 'three';
import {lunarSiteToPosition, lunarSiteToUV} from '../src/science/lunar-map.ts';
const source = JSON.parse(readFileSync(new URL('../assets/lroc-source.json',import.meta.url),'utf8'));
const provenance = JSON.parse(readFileSync(new URL('../public/textures/provenance.json',import.meta.url),'utf8'));
const png = readFileSync(new URL('../public/textures/moon-lro.png',import.meta.url));
const digest = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const close = (a: number,b: number,tolerance=1e-9) => assert.ok(Math.abs(a-b)<=tolerance, `${a} != ${b}`);

test('runtime image is a bounded, full-resolution lossless grayscale PNG with reviewed provenance', async () => {
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format,'png'); assert.equal(metadata.width,2880); assert.equal(metadata.height,1440);
  assert.equal(metadata.channels,1); assert.equal(metadata.depth,'uchar');
  assert.ok(png.length<3_500_000); assert.equal(png.length,provenance.runtimeAsset.bytes);
  assert.equal(digest(png),provenance.runtimeAsset.sha256);
  assert.equal(provenance.sourceSha256,source.sourceSha256);
  assert.equal(provenance.scientificUse,'VISUAL_TEXTURE_ONLY');
});
test('ALL decoded runtime pixels match the reviewed source pixel hash, without radiometric or height transformation', async () => {
  const pixels = await sharp(png).toColourspace('b-w').raw().toBuffer();
  assert.equal(pixels.length,2880*1440);
  assert.equal(digest(pixels),source.sourcePixelSha256);
  assert.equal(provenance.conversion.resize,false); assert.equal(provenance.conversion.enhancement,false);
});
test('GeoTIFF metre tiepoint and resolution correspond to documented global longitude/latitude bounds', () => {
  const g=source.sourceMetadata.geotiff; const r=g.lunarRadiusMeters;
  const x0=g.tiePoint[3], y0=g.tiePoint[4];
  close(x0/r*180/Math.PI,-180); close(y0/r*180/Math.PI,90);
  close((x0+2880*g.pixelScaleMeters[0])/r*180/Math.PI,180);
  close((y0-1440*g.pixelScaleMeters[1])/r*180/Math.PI,-90);
  assert.equal(g.rasterType,'PixelIsArea');
});
test('longitude zero is +X, east90 is -Z, seam is -X, north is +Y', () => {
  const cases: [number,number,[number,number,number]][] = [[0,0,[1,0,0]],[0,90,[0,0,-1]],[0,-90,[0,0,1]],[0,180,[-1,0,0]],[90,0,[0,1,0]],[-90,0,[0,-1,0]]];
  for(const [lat,lon,expected] of cases)lunarSiteToPosition(lat,lon).forEach((v,i)=>close(v,expected[i]));
  assert.deepEqual(lunarSiteToUV(0,0),[0.5,0.5]);
  assert.deepEqual(lunarSiteToUV(90,-180),[0,1]);
  assert.deepEqual(lunarSiteToUV(-90,180),[1,0]);
});
test('marker positions agree with actual Three SphereGeometry UV vertices and seam on both sides', () => {
  const geometry=new SphereGeometry(1,32,16);
  try {
    const uv=geometry.getAttribute('uv');const position=geometry.getAttribute('position');
    for(let i=0;i<uv.count;i++) {
      const expected=lunarSiteToPosition(uv.getY(i)*180-90,uv.getX(i)*360-180);
      close(position.getX(i),expected[0],1e-6);close(position.getY(i),expected[1],1e-6);close(position.getZ(i),expected[2],1e-6);
    }
    lunarSiteToPosition(17,-180).forEach((v,i)=>close(v,lunarSiteToPosition(17,180)[i]));
  } finally {geometry.dispose();}
});
test('converter rejects an unreviewed source before changing the runtime asset', () => {
  const dir=mkdtempSync(join(tmpdir(),'h89-invalid-source-'));
  try {
    const path=join(dir,'incorrect.tif');writeFileSync(path,'not the supplied scientific source');
    const result=spawnSync(process.execPath,['scripts/convert-moon.cjs',path],{encoding:'utf8'});
    assert.equal(result.status,1);assert.match(result.stderr,/does not match/);
    assert.equal(digest(readFileSync(new URL('../public/textures/moon-lro.png',import.meta.url))),provenance.runtimeAsset.sha256);
  }finally {rmSync(dir,{recursive:true,force:true});}
});
