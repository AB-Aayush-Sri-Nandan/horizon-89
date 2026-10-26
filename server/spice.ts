import {spawn} from 'node:child_process';
import type {ChildProcessWithoutNullStreams} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ApiError} from './errors.ts';
import {validateSiteTime} from '../shared/validation.ts';
import type {ScienceRequest} from '../shared/celestial.ts';

const FRAMES = new Set(['MOON_PA','MOON_ME','ITRF93','IAU_SUN','IAU_MERCURY','IAU_VENUS','IAU_EARTH','IAU_MARS','IAU_JUPITER','IAU_SATURN','IAU_URANUS','IAU_NEPTUNE','IAU_PLUTO']);
const CODES = new Set(['VALIDATION_ERROR','SCIENCE_KERNEL_MISSING','SCIENCE_KERNEL_MISMATCH','KERNEL_COVERAGE_ERROR','SCIENCE_STATE_UNAVAILABLE','FRAME_TRANSFORM_ERROR']);
export interface SciencePort {request(request:ScienceRequest):Promise<unknown>;close?():void}
export function parseScienceQuery(query:Record<string,unknown>): ScienceRequest {
  if(Object.keys(query).some(k=>!['utc','centre','targets','frames','frame','aberration'].includes(k)))throw new ApiError('VALIDATION_ERROR','Unknown celestial query parameter.',400);
  if(typeof query.utc!=='string')throw new ApiError('VALIDATION_ERROR','One canonical millisecond UTC is required.',400);
  try{validateSiteTime(0,0,query.utc);}catch{throw new ApiError('VALIDATION_ERROR','Invalid canonical UTC.',400);}
  if(query.utc<'1972-01-01T00:00:00.000Z')throw new ApiError('VALIDATION_ERROR','Science UTC policy begins in1972.',400);
  const centre=query.centre??'SUN';
  if(typeof centre!=='string'||!['SUN','SSB','EARTH','MOON'].includes(centre))throw new ApiError('VALIDATION_ERROR','Unsupported position centre.',400);
  if((query.frame!==undefined&&query.frame!=='J2000')||(query.aberration!==undefined&&query.aberration!=='NONE'))throw new ApiError('VALIDATION_ERROR','Physical states require J2000 and aberration NONE.',400);
  const request:Extract<ScienceRequest,{operation:'state'}>={operation:'state',utc:query.utc,centre:centre as 'SUN'|'SSB'|'EARTH'|'MOON'};
  if(query.targets!==undefined){
    if(typeof query.targets!=='string'||query.targets.length>100||!/^\d{1,3}(,\d{1,3})*$/.test(query.targets))throw new ApiError('VALIDATION_ERROR','Use comma-separated integer NAIF target IDs.',400);
    const ids=query.targets.split(',').map(Number);
    if(ids.length>20||ids.some(id=>id<1)||new Set(ids).size!==ids.length)throw new ApiError('VALIDATION_ERROR','Use1..20 distinct positive target IDs.',400);
    request.targets=ids;
  }
  if(query.frames!==undefined){
    if(typeof query.frames!=='string'||query.frames.length>300)throw new ApiError('VALIDATION_ERROR','Invalid body-frame list.',400);
    const frames=query.frames.split(',');
    if(frames.length>13||new Set(frames).size!==frames.length||frames.some(f=>!FRAMES.has(f)))throw new ApiError('VALIDATION_ERROR','Unsupported or duplicate body frame.',400);
    request.frames=frames;
  }
  return request;
}
function deepFreeze(value:unknown):unknown {
  if(value&&typeof value==='object'){
    for(const child of Object.values(value))deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
export class SpiceClient implements SciencePort {
  private child:ChildProcessWithoutNullStreams|null=null;
  private startup:Promise<void>|null=null;
  private startupResolve:(()=>void)|null=null;
  private failure:ApiError|null=null;
  private startupReject:((e:ApiError)=>void)|null=null;
  private startupTimer:ReturnType<typeof setTimeout>|null=null;
  private sequence=0;
  private pending=new Map<number,{resolve:(v:unknown)=>void;reject:(e:ApiError)=>void;timer:ReturnType<typeof setTimeout>}>();
  private python:string;
  constructor(python=process.env.H89_SCIENCE_PYTHON??fileURLToPath(new URL('../science/.venv/bin/python',import.meta.url))){this.python=python;}
  private stop(error:ApiError){
    if(this.failure)return;
    this.failure=error;
    if(this.startupTimer)clearTimeout(this.startupTimer);
    this.startupReject?.(error);
    for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}
    this.pending.clear();this.child?.kill();this.child=null;
  }
  private ensure():Promise<void>{
    if(this.failure)return Promise.reject(this.failure);
    if(this.startup)return this.startup;
    this.startup=new Promise<void>((resolve,reject)=>{this.startupResolve=resolve;this.startupReject=reject;});
    const unavailable=()=>new ApiError('SCIENCE_SERVICE_UNAVAILABLE','Local science worker unavailable. Run science setup and restart the API.',503,true);
    this.startupTimer=setTimeout(()=>this.stop(unavailable()),10000);
    let child:ChildProcessWithoutNullStreams;
    try{child=spawn(this.python,['-I',fileURLToPath(new URL('../science/app/worker.py',import.meta.url))],{stdio:['pipe','pipe','pipe']});}
    catch{this.stop(unavailable());return this.startup;}
    this.child=child;let buffer='';
    child.stderr.resume(); // No interpreter paths, stack traces or environment details in client responses/logs.
    child.on('error',()=>this.stop(unavailable()));child.on('exit',()=>this.stop(unavailable()));
    child.stdin.on('error',()=>this.stop(unavailable()));
    child.stdout.on('data',(chunk:Buffer)=>{
      buffer+=chunk.toString('utf8');if(Buffer.byteLength(buffer)>1_000_000){this.stop(unavailable());return;}
      for(;;){const index=buffer.indexOf('\n');if(index<0)break;const line=buffer.slice(0,index);buffer=buffer.slice(index+1);
        try{
          const message=JSON.parse(line);
          if(message.ready===true){if(this.startupTimer)clearTimeout(this.startupTimer);this.startupResolve?.();continue;}
          if(message.status==='UNAVAILABLE'&&message.error){
            const code=CODES.has(message.error.code)?message.error.code:'SCIENCE_SERVICE_UNAVAILABLE';
            this.stop(new ApiError(code,'Pinned science kernels are missing or unusable; inspect local science setup.',503));return;
          }
          const pending=this.pending.get(message.id);if(!pending||!message.result)throw new Error('Invalid worker protocol');
          clearTimeout(pending.timer);this.pending.delete(message.id);
          if(message.result.status==='UNAVAILABLE'&&message.result.error){
            const code=CODES.has(message.result.error.code)?message.result.error.code:'SCIENCE_SERVICE_UNAVAILABLE';
            pending.reject(new ApiError(code,code==='VALIDATION_ERROR'?'Invalid science request.':'Science computation unavailable for the requested inputs.',code==='VALIDATION_ERROR'?400:503));
          }else{pending.resolve(deepFreeze(message.result));}
        }catch{this.stop(unavailable());return;}
      }
    });
    return this.startup;
  }
  async request(request:ScienceRequest):Promise<unknown>{
    await this.ensure();
    if(this.failure||!this.child)throw this.failure??new ApiError('SCIENCE_SERVICE_UNAVAILABLE','Local science worker unavailable.',503);
    if(this.pending.size>=16)throw new ApiError('RATE_LIMITED','Local science queue is full.',429,true);
    const id=++this.sequence;
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>this.stop(new ApiError('SCIENCE_SERVICE_UNAVAILABLE','Local science computation timed out.',503,true)),10000);
      this.pending.set(id,{resolve,reject,timer});
      this.child!.stdin.write(JSON.stringify({id,request})+'\n');
    });
  }
  close(){this.stop(new ApiError('SCIENCE_SERVICE_UNAVAILABLE','Local science worker stopped.',503));}
}
