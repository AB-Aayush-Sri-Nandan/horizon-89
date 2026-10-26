/** Explicit opt-in only; never a PR dependency and never an offline fixture success. */
import {HorizonsService} from '../server/horizons.ts';
import {ApiError} from '../server/errors.ts';
if (process.env.H89_LIVE_SMOKE !== '1') {
  console.error('Live smoke not run. Opt in with H89_LIVE_SMOKE=1 npm run test:live.');
  process.exitCode = 2;
} else {
  try {
    const service = new HorizonsService();
    const input = {latitude:-89,longitude:0,altitudeKm:0,timeUTC:'2026-10-10T06:00:00.123Z'};
    const result = await service.geometry(input);
    if (result.status !== 'LIVE') throw new Error('Fresh service must retrieve LIVE geometry.');
    console.log(JSON.stringify(result,null,2));
    const cached = await service.geometry(input);
    if (cached.status !== 'CACHED' || cached.provenance?.producedAtUTC !== result.provenance?.producedAtUTC) throw new Error('Live-result cache failed.');
    console.log('LIVE retrieval and cache reuse verified. Historical values still require explicit comparison.');
  } catch (e) {
    const error = e as Error;
    console.error(JSON.stringify({status:'UNAVAILABLE',code:e instanceof ApiError ? e.code : 'INTERNAL_ERROR',
      message:error.message,...(e instanceof ApiError && e.diagnostic ? {upstreamDiagnostic:e.diagnostic} : {})}));
    process.exitCode = 1;
  }
}
