/** TEST ENTRY POINT ONLY. Production server/index.ts never imports this fixture transport. */
import {readFileSync} from 'node:fs';
import {createApp} from '../../server/app.ts';
import {HorizonsService} from '../../server/horizons.ts';
const sun = readFileSync(new URL('../fixtures/sun-observer.txt', import.meta.url), 'utf8');
const earth = readFileSync(new URL('../fixtures/earth-observer.txt', import.meta.url), 'utf8');
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const service = new HorizonsService({fetchImpl: async input => {
  const params = new URL(String(input)).searchParams;
  // Deterministic failure case for browser verification; no production fixture controls exist.
  if (params.get('SITE_COORD')!.split(',')[1] === '-88') return Response.json({error: 'Controlled test upstream unavailable'});
  const utc = params.get('TLIST')!.slice(1,-1);
  const calendar = utc.replace(/^(\d{4})-(\d{2})-/, (_all,y,m) => `${y}-${months[Number(m)-1]}-`);
  const source = params.get('COMMAND') === "'10'" ? sun : earth;
  return Response.json({signature:{version:'CONTROLLED_TEST_FIXTURE'},result:source.replace('2026-Oct-10 06:00:00.123',calendar)});
}});
const server = createApp({service}).listen(3002, '127.0.0.1', () => console.log('TEST FIXTURE API on 127.0.0.1:3002 — not live NASA data'));
for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal, () => server.close(() => process.exit(0)));
