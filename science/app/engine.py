"""Local deterministic physical state only. One process owns one immutable SPICE pool."""
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sys

import numpy as np
import spiceypy as spice
from spiceypy.utils.exceptions import SpiceyError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from kernel_common import load_manifest, verify_file

FRAMES = ('MOON_PA', 'MOON_ME', 'ITRF93', 'IAU_SUN', 'IAU_MERCURY', 'IAU_VENUS',
          'IAU_EARTH', 'IAU_MARS', 'IAU_JUPITER', 'IAU_SATURN', 'IAU_URANUS', 'IAU_NEPTUNE', 'IAU_PLUTO')
CENTRES = {'SUN': 10, 'SSB': 0, 'EARTH': 399, 'MOON': 301}
DEFAULT_TARGETS = (10, 199, 299, 399, 301, 4, 5, 6, 7, 8)
# Explicitly declared orbit-plane proxies, never substituted into a requested physical state.
ORBIT_TARGETS = {10: None, 199: 199, 299: 299, 399: 399, 301: 301,
                 499: 4, 599: 5, 699: 6, 799: 7, 899: 8, 999: 9}
LIMITATIONS = (
    'Geometric simultaneous states (abcorr=NONE), not apparent observer directions.',
    'UTC/ET uses pinned naif0012.tls; leap seconds after its last 2017-01-01 entry are not predicted.',
    'No terrain, Horizons replacement, display scaling, or flight-certified accuracy claim.',
)


class ScienceFailure(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def unavailable(error):
    return {'status': 'UNAVAILABLE', 'error': {'code': error.code, 'message': str(error), 'retryable': False}}


@dataclass(frozen=True, slots=True)
class PhysicalState:
    naif_id: int
    position_km: tuple
    velocity_km_s: tuple
    epoch_et_seconds: float
    frame: str = 'J2000'
    aberration: str = 'NONE'


def _intervals(cell):
    return [[float(a), float(b)] for a, b in zip(list(cell)[::2], list(cell)[1::2])]


def _contains(intervals, epoch):
    return any(a <= epoch <= b for a, b in intervals)


class Engine:
    def __init__(self, data_dir=None):
        self.manifest = load_manifest()
        self.kernel_hash = hashlib.sha256(json.dumps(self.manifest, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        self.data_dir = Path(data_dir) if data_dir else ROOT / 'kernels' / 'data'
        # Verify the entire set before touching the global SPICE pool.
        for entry in self.manifest['kernels']:
            path = self.data_dir / entry['filename']
            if not path.is_file():
                raise ScienceFailure('SCIENCE_KERNEL_MISSING', 'A required pinned kernel is missing.')
            try:
                verify_file(path, entry)
            except ValueError as error:
                raise ScienceFailure('SCIENCE_KERNEL_MISMATCH', 'A required kernel failed integrity verification.') from error
        spice.kclear()
        try:
            for entry in self.manifest['kernels']:
                spice.furnsh(str((self.data_dir / entry['filename']).resolve()))
            self.spk_coverage = {}
            self.pck_coverage = {}
            for entry in self.manifest['kernels']:
                path = str((self.data_dir / entry['filename']).resolve())
                if entry['type'] == 'SPK':
                    for body in spice.spkobj(path):
                        self.spk_coverage[int(body)] = _intervals(spice.spkcov(path, int(body)))
                if entry['type'] == 'BINARY_PCK':
                    ids = spice.utils.support_types.SPICEINT_CELL(128)
                    spice.pckfrm(path, ids)
                    for frame in ids:
                        self.pck_coverage[int(frame)] = _intervals(spice.pckcov(path, int(frame)))
        except SpiceyError as error:
            spice.kclear()
            raise ScienceFailure('SCIENCE_KERNEL_MISMATCH', 'The verified kernel set could not be loaded.') from error

    def time(self, utc):
        if not isinstance(utc, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z', utc):
            raise ScienceFailure('VALIDATION_ERROR', 'Use canonical millisecond UTC with Z.')
        try:
            date = datetime.strptime(utc, '%Y-%m-%dT%H:%M:%S.%fZ')
        except ValueError as error:
            raise ScienceFailure('VALIDATION_ERROR', 'Invalid UTC calendar time.') from error
        if date.year < 1972:
            raise ScienceFailure('VALIDATION_ERROR', 'This API supports UTC from 1972; pre-1972 drift and leap-second labels are outside its contract.')
        try:
            return float(spice.str2et(utc[:-1].replace('T', ' ') + ' UTC'))
        except SpiceyError as error:
            raise ScienceFailure('VALIDATION_ERROR', 'UTC could not be converted with the pinned LSK.') from error

    def provenance(self, utc, centre, method):
        return {'provider': 'NAIF_SPICE', 'sourceVersion': spice.__version__, 'model': 'DE440 / pinned PCK models',
                'observationTimeUTC': utc, 'producedAtUTC': datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'),
                'frame': 'J2000', 'centre': centre, 'aberrationCorrection': 'NONE',
                'kernelSetId': self.manifest['kernelSetId'], 'kernelSetHash': self.kernel_hash,
                'toolkitVersion': spice.tkvrsn('TOOLKIT'), 'cacheStatus': 'NOT_APPLICABLE',
                'method': method, 'limitations': list(LIMITATIONS)}

    def state(self, target, centre_id, et):
        if type(target) is not int or target not in self.spk_coverage:
            raise ScienceFailure('SCIENCE_STATE_UNAVAILABLE', 'Requested body centre is absent from the pinned SPK; no barycentre substitution was made.')
        for body in [target, centre_id]:
            if body != 0 and (body not in self.spk_coverage or not _contains(self.spk_coverage[body], et)):
                raise ScienceFailure('KERNEL_COVERAGE_ERROR', 'Requested state epoch is outside actual SPK coverage.')
        try:
            vector, _ = spice.spkezr(str(target), et, 'J2000', 'NONE', str(centre_id))
        except SpiceyError as error:
            raise ScienceFailure('SCIENCE_STATE_UNAVAILABLE', 'The pinned ephemerides do not support this state chain.') from error
        if not np.isfinite(vector).all():
            raise ScienceFailure('SCIENCE_STATE_UNAVAILABLE', 'Nonfinite state rejected.')
        return PhysicalState(target, tuple(float(v) for v in vector[:3]), tuple(float(v) for v in vector[3:]), et)

    def orientation(self, frame, utc, et):
        if frame not in FRAMES:
            raise ScienceFailure('VALIDATION_ERROR', 'Unsupported body-fixed frame.')
        if frame in ('MOON_PA', 'MOON_ME') and not _contains(self.pck_coverage[31008], et):
            raise ScienceFailure('KERNEL_COVERAGE_ERROR', 'Requested epoch is outside lunar binary PCK coverage.')
        if frame == 'ITRF93' and not _contains(self.pck_coverage[3000], et):
            raise ScienceFailure('KERNEL_COVERAGE_ERROR', 'Requested epoch is outside the dated Earth PCK; no IAU_EARTH fallback.')
        if frame.startswith('IAU_') and not _contains(self.spk_coverage[399], et):
            raise ScienceFailure('KERNEL_COVERAGE_ERROR', 'Generic IAU orientation is exposed only within the pinned SPK evaluation domain; no remote extrapolation.')
        try:
            matrix = spice.pxform('J2000', frame, et)
            transform = spice.sxform('J2000', frame, et)
            quaternion = spice.m2q(matrix)  # SPICE WXYZ -> explicit XYZW wire convention.
            cross = -matrix.T @ transform[3:, :3]
            omega = np.array([cross[2, 1], cross[0, 2], cross[1, 0]])
            body = spice.frinfo(spice.namfrm(frame))[0]
        except SpiceyError as error:
            raise ScienceFailure('FRAME_TRANSFORM_ERROR', 'Frame transformation is not supported at the requested epoch.') from error
        if not np.isfinite(matrix).all() or not np.isfinite(omega).all():
            raise ScienceFailure('FRAME_TRANSFORM_ERROR', 'Nonfinite rotation rejected.')
        orbit_target = ORBIT_TARGETS[body]
        rotation = {'status': 'UNAVAILABLE', 'reason': 'No planetary orbital-plane rotation classification for this frame.'}
        if orbit_target is not None:
            try:
                orbit_centre = 399 if body == 301 else 10
                orbit = self.state(orbit_target, orbit_centre, et)
                normal = np.cross(orbit.position_km, orbit.velocity_km_s)
                denominator = np.linalg.norm(omega) * np.linalg.norm(normal)
                if not np.isfinite(denominator) or denominator <= 0:
                    raise ScienceFailure('SCIENCE_STATE_UNAVAILABLE', 'Degenerate spin or orbital plane.')
                cosine = float(np.dot(omega, normal) / denominator)
                rotation = {'status': 'DERIVED', 'sense': 'INDETERMINATE' if abs(cosine) < 1e-12 else 'PROGRADE' if cosine > 0 else 'RETROGRADE',
                            'spinOrbitCosine': cosine, 'orbitTargetNaifId': orbit_target,
                            'orbitCentreNaifId': orbit_centre, 'usesSystemBarycentrePlane': orbit_target != body,
                            'method': 'sign(dot(inertial angular velocity, orbital r cross v)); not PM-rate sign alone'}
            except ScienceFailure:
                rotation = {'status': 'UNAVAILABLE', 'reason': 'No supported orbital state for classification at this epoch.'}
        model = 'DE440_BINARY_LUNAR_PCK' if frame.startswith('MOON_') else 'DATED_EARTH_BINARY_PCK' if frame == 'ITRF93' else 'GENERIC_IAU_TEXT_PCK'
        limitations = ['Matrix maps J2000 column vectors into the named body frame; row-major wire storage.',
                      'Rotating-frame velocities require sxform and its derivative; do not apply this 3x3 matrix to velocity alone.']
        if model == 'GENERIC_IAU_TEXT_PCK':
            limitations.append('Generic IAU analytic orientation, not high-precision Earth/lunar orientation or a certified validity interval.')
        if frame == 'ITRF93':
            limitations.append('Dated Earth PCK last data epoch 2026-10-25; later values include prediction.')
        return {'status': 'COMPUTED', 'bodyFixedFrame': frame, 'frameId': spice.namfrm(frame), 'bodyNaifId': body,
                'matrixJ2000ToBody': matrix.tolist(), 'matrixLayout': 'ROW_MAJOR',
                'quaternionJ2000ToBodyXYZW': [float(v) for v in quaternion[1:]] + [float(quaternion[0])],
                'angularVelocityJ2000RadS': omega.tolist(), 'model': model, 'rotationRelativeToOrbit': rotation,
                'provenance': {**self.provenance(utc, str(body), 'SPICE_PXFORM_SXFORM'), 'limitations': list(LIMITATIONS) + limitations}}

    def capabilities(self):
        frames = []
        for frame in FRAMES:
            body, frame_class, class_id = spice.frinfo(spice.namfrm(frame))
            frames.append({'name': frame, 'frameId': spice.namfrm(frame), 'bodyNaifId': body,
                           'frameClass': frame_class, 'classId': class_id,
                           'apiEvaluationDomainET': self.spk_coverage[399] if frame.startswith('IAU_') else None,
                           'coverageET': self.pck_coverage.get(31008 if frame.startswith('MOON_') else class_id),
                           'coverageNote': 'Actual binary segment union' if frame.startswith('MOON_') or frame == 'ITRF93' else 'Text PCK has no segment-defined validity interval; computable is not certified accuracy.'})
        return {'status': 'COMPUTED', 'kernelSetId': self.manifest['kernelSetId'], 'kernelSetHash': self.kernel_hash,
                'toolkitVersion': spice.tkvrsn('TOOLKIT'), 'spiceypyVersion': spice.__version__, 'numpyVersion': np.__version__,
                'kernels': [{k: entry[k] for k in ('filename','type','expectedBytes','sha256')} for entry in self.manifest['kernels']],
                'bodies': [{'naifId': body, 'name': spice.bodc2n(body),
                            'identity': 'SYSTEM_BARYCENTRE' if body < 10 else 'BODY_CENTRE', 'coverageET': intervals}
                           for body, intervals in sorted(self.spk_coverage.items())],
                'lunarFrameDefinitions': {f: {'frameId': spice.namfrm(f), 'frameInfo': list(spice.frinfo(spice.namfrm(f)))} for f in ('MOON_PA','MOON_ME','MOON_PA_DE440','MOON_ME_DE440_ME421')},
                'frames': frames, 'centres': CENTRES, 'stateFrame': 'J2000', 'aberrationCorrection': 'NONE',
                'timePolicy': 'Canonical UTC >=1972, str2et with pinned LSK; ET=TDB seconds past J2000, no leap-second-labelled :60 input.',
                'earthLastDataUTC': '2026-10-25T00:00:00.000Z', 'lastLSKLeapEntryUTC': '2017-01-01T00:00:00.000Z',
                'limitations': list(LIMITATIONS)}

    def compute(self, request):
        if not isinstance(request, dict):
            raise ScienceFailure('VALIDATION_ERROR', 'Request must be an object.')
        if request.get('operation') == 'capabilities':
            if set(request) != {'operation'}:
                raise ScienceFailure('VALIDATION_ERROR', 'Unexpected capability parameter.')
            return self.capabilities()
        if set(request) - {'operation', 'utc', 'centre', 'targets', 'frames'} or request.get('operation') != 'state':
            raise ScienceFailure('VALIDATION_ERROR', 'Unsupported science request.')
        et = self.time(request.get('utc'))
        centre = request.get('centre', 'SUN')
        targets = request.get('targets', list(DEFAULT_TARGETS))
        frames = request.get('frames', [])
        if not isinstance(centre, str) or centre not in CENTRES:
            raise ScienceFailure('VALIDATION_ERROR', 'Supported centres: SUN, SSB, EARTH, MOON.')
        if not isinstance(targets, list) or not 1 <= len(targets) <= 20 or any(type(v) is not int or v < 1 or v > 999 for v in targets) or len(set(targets)) != len(targets):
            raise ScienceFailure('VALIDATION_ERROR', 'Use 1..20 distinct integer target IDs.')
        if not isinstance(frames, list) or len(frames) > len(FRAMES) or any(not isinstance(f, str) or f not in FRAMES for f in frames) or len(set(frames)) != len(frames):
            raise ScienceFailure('VALIDATION_ERROR', 'Use distinct supported body frames.')
        utc = request['utc']
        provenance = self.provenance(utc, centre, 'SPICE_SPKEZR_GEOMETRIC')
        bodies = []
        for target in targets:
            try:
                state = self.state(target, CENTRES[centre], et)
                bodies.append({'status': 'COMPUTED', 'naifId': target, 'name': spice.bodc2n(target),
                               'identity': 'SYSTEM_BARYCENTRE' if target < 10 else 'BODY_CENTRE',
                               'position': {'xyz': state.position_km, 'units': 'km', 'frame': 'J2000', 'centre': centre, 'epochUTC': utc, 'aberrationCorrection': 'NONE'},
                               'velocity': {'xyz': state.velocity_km_s, 'units': 'km/s', 'frame': 'J2000', 'centre': centre, 'epochUTC': utc, 'aberrationCorrection': 'NONE'},
                               'provenance': provenance})
            except ScienceFailure as error:
                bodies.append({'naifId': target, **unavailable(error)})
        orientations = {}
        for frame in frames:
            try:
                orientations[frame] = self.orientation(frame, utc, et)
            except ScienceFailure as error:
                orientations[frame] = unavailable(error)
        computed = [b['status'] == 'COMPUTED' for b in bodies] + [o['status'] == 'COMPUTED' for o in orientations.values()]
        return {'schemaVersion': '2A.1', 'status': 'COMPUTED' if any(computed) else 'UNAVAILABLE',
                'complete': all(computed), 'timeUTC': utc, 'ephemerisTime': {'secondsPastJ2000TDB': et, 'method': 'STR2ET_PINNED_LSK'},
                'reference': {'frame': 'J2000', 'centre': centre, 'aberrationCorrection': 'NONE'},
                'bodies': bodies, 'orientations': orientations, 'provenance': provenance}
