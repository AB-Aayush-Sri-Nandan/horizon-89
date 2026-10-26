import type {ScienceProvenance, ScientificVector, ScienceError} from './science.ts';
/** Physical wire contract only: no renderer units, radius enhancement or distance compression. */
export type ImmutableVector = Readonly<Omit<ScientificVector, 'xyz'> & {xyz: readonly [number,number,number]}>;
export interface KernelProvenance extends ScienceProvenance {
  kernelSetHash: string;
  toolkitVersion: string;
}
export type UnavailableScience = Readonly<{status:'UNAVAILABLE';error: Pick<ScienceError,'code'|'message'|'retryable'>}>;
export type PhysicalBody = Readonly<{
  status:'COMPUTED';naifId:number;name:string;identity:'SYSTEM_BARYCENTRE'|'BODY_CENTRE';
  position:ImmutableVector;velocity:ImmutableVector;provenance:Readonly<KernelProvenance>;
}>;
export type PhysicalOrientation = Readonly<{
  status:'COMPUTED';bodyFixedFrame:string;frameId:number;bodyNaifId:number;
  matrixJ2000ToBody:readonly (readonly number[])[];matrixLayout:'ROW_MAJOR';
  quaternionJ2000ToBodyXYZW:readonly [number,number,number,number];
  angularVelocityJ2000RadS:readonly [number,number,number];model:string;
  provenance:Readonly<KernelProvenance>;
  rotationRelativeToOrbit:Readonly<Record<string,unknown>>;
}>;
export interface CelestialResponse {
  readonly schemaVersion:'2A.1';readonly status:'COMPUTED'|'UNAVAILABLE';readonly complete:boolean;
  readonly timeUTC:string;readonly ephemerisTime:Readonly<{secondsPastJ2000TDB:number;method:'STR2ET_PINNED_LSK'}>;
  readonly reference:Readonly<{frame:'J2000';centre:'SUN'|'SSB'|'EARTH'|'MOON';aberrationCorrection:'NONE'}>;
  readonly bodies:readonly (PhysicalBody | (UnavailableScience & {readonly naifId:number}))[];
  readonly orientations:Readonly<Record<string,PhysicalOrientation|UnavailableScience>>;
  readonly provenance:Readonly<KernelProvenance>;
}
export type ScienceRequest = {operation:'capabilities'} | {
  operation:'state';utc:string;centre:'SUN'|'SSB'|'EARTH'|'MOON';targets?:readonly number[];frames?:readonly string[];
};
