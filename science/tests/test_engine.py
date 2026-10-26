from dataclasses import FrozenInstanceError
import json
from pathlib import Path
import sys
import tempfile
import unittest
import numpy as np
import spiceypy as spice
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'app'))
from engine import Engine, ScienceFailure, FRAMES

EPOCHS = ['2000-01-01T12:00:00.000Z','2010-06-01T00:00:00.000Z','2026-10-10T06:00:00.123Z']


class CelestialScienceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = Engine()

    def test_actual_spk_body_set_and_binary_coverage(self):
        self.assertEqual(set(self.engine.spk_coverage), set(range(1,11)) | {199,299,301,399})
        self.assertNotIn(499,self.engine.spk_coverage)
        self.assertEqual(self.engine.spk_coverage[399],[[-4734072000.0,4735368000.0]])
        self.assertEqual(self.engine.pck_coverage[31008],[[-14200747200.0,20514081600.0]])
        self.assertAlmostEqual(self.engine.pck_coverage[3000][0][0],-43135.816087188054,places=7)
        self.assertAlmostEqual(self.engine.pck_coverage[3000][0][1],853761669.1844847,places=7)

    def test_time_j2000_anchor_and_millisecond_roundtrip(self):
        # J2000 is JD2451545.0 TDB, not noon UTC. UTC noon differs by ~64.184s here.
        et=self.engine.time(EPOCHS[0]);self.assertLess(abs(et-64.184),0.001)
        for utc in EPOCHS:
            self.assertEqual(spice.et2utc(self.engine.time(utc),'ISOC',3)+'Z',utc)
        self.assertAlmostEqual(self.engine.time('2026-10-10T06:00:00.124Z')-self.engine.time(EPOCHS[2]),0.001,delta=2e-7)

    def test_utc_validation_never_guesses_timezones_or_leap_second_labels(self):
        for utc in ['bad','2026-02-30T00:00:00.000Z','2026-01-01T00:00:00Z','2026-01-01T00:00:00.000+00:00','2016-12-31T23:59:60.000Z','1960-01-01T00:00:00.000Z']:
            with self.subTest(utc=utc),self.assertRaises(ScienceFailure):self.engine.time(utc)

    def test_geometric_states_match_spkgeo_and_chain_closure_at_three_epochs(self):
        for utc in EPOCHS:
            et=self.engine.time(utc)
            for target in self.engine.spk_coverage:
                state=self.engine.state(target,10,et)
                # Different CSPICE API over same kernels; internal consistency, not an independent ephemeris oracle.
                expected,_=spice.spkgeo(target,et,'J2000',10)
                np.testing.assert_allclose(state.position_km,expected[:3],rtol=0,atol=1e-6)
                np.testing.assert_allclose(state.velocity_km_s,expected[3:],rtol=0,atol=1e-11)
            earth=self.engine.state(399,10,et);moon=self.engine.state(301,399,et);moon_sun=self.engine.state(301,10,et)
            np.testing.assert_allclose(np.array(earth.position_km)+moon.position_km,moon_sun.position_km,rtol=0,atol=1e-6)
            np.testing.assert_allclose(np.array(earth.velocity_km_s)+moon.velocity_km_s,moon_sun.velocity_km_s,rtol=0,atol=1e-11)

    def test_velocity_is_finite_difference_of_position(self):
        for utc in EPOCHS:
            et=self.engine.time(utc)
            for target in [199,299,399,301,4,5,6,7,8,9]:
                plus=np.array(self.engine.state(target,10,et+1).position_km)
                minus=np.array(self.engine.state(target,10,et-1).position_km)
                velocity=self.engine.state(target,10,et).velocity_km_s
                # 1s central difference; tolerance covers float64 cancellation at outer-planet distances, not model accuracy.
                np.testing.assert_allclose((plus-minus)/2,velocity,rtol=0,atol=2e-6)

    def test_physical_state_is_frozen_and_has_no_display_coordinates(self):
        state=self.engine.state(399,10,self.engine.time(EPOCHS[2]))
        with self.assertRaises(FrozenInstanceError):state.frame='DISPLAY'
        with self.assertRaises(TypeError):state.position_km[0]=0
        self.assertFalse(hasattr(state,'radiusSceneUnits'))

    def test_missing_body_is_not_replaced_by_barycentre(self):
        result=self.engine.compute({'operation':'state','utc':EPOCHS[2],'targets':[499,4]})
        self.assertEqual(result['bodies'][0]['status'],'UNAVAILABLE');self.assertNotIn('position',result['bodies'][0])
        self.assertEqual(result['bodies'][1]['identity'],'SYSTEM_BARYCENTRE')
        self.assertFalse(result['complete'])

    def test_spk_boundaries_and_unavailable_only_result(self):
        a,b=self.engine.spk_coverage[399][0]
        self.engine.state(399,0,a);self.engine.state(399,0,b)
        for epoch in [a-1,b+1]:
            with self.assertRaises(ScienceFailure) as ctx:self.engine.state(399,0,epoch)
            self.assertEqual(ctx.exception.code,'KERNEL_COVERAGE_ERROR')
        with self.assertRaises(ScienceFailure):self.engine.orientation('IAU_VENUS',EPOCHS[2],b+1)
        result=self.engine.compute({'operation':'state','utc':'2200-01-01T00:00:00.000Z','targets':[399]})
        self.assertEqual(result['status'],'UNAVAILABLE');self.assertNotIn('position',result['bodies'][0])

    def test_all_verified_frame_matrices_and_quaternions_at_three_epochs(self):
        for utc in EPOCHS:
            et=self.engine.time(utc)
            for frame in FRAMES:
                with self.subTest(utc=utc,frame=frame):
                    result=self.engine.orientation(frame,utc,et);r=np.array(result['matrixJ2000ToBody'])
                    np.testing.assert_allclose(r@r.T,np.eye(3),rtol=0,atol=2e-14)
                    self.assertAlmostEqual(np.linalg.det(r),1,places=13)
                    q=result['quaternionJ2000ToBodyXYZW']
                    np.testing.assert_allclose(spice.q2m([q[3],*q[:3]]),r,rtol=0,atol=2e-14)
                    self.assertAlmostEqual(np.linalg.norm(q),1,places=14)
                    h=0.1;dr=(spice.pxform('J2000',frame,et+h)-spice.pxform('J2000',frame,et-h))/(2*h)
                    np.testing.assert_allclose(dr,spice.sxform('J2000',frame,et)[3:,:3],rtol=0,atol=1e-9)

    def test_lunar_aliases_fixed_offset_and_geometric_libration(self):
        rotations=[];directions=[]
        for utc in ['2026-10-01T00:00:00.000Z','2026-10-08T00:00:00.000Z','2026-10-15T00:00:00.000Z','2026-10-22T00:00:00.000Z']:
            et=self.engine.time(utc)
            for alias,full in [('MOON_PA','MOON_PA_DE440'),('MOON_ME','MOON_ME_DE440_ME421')]:
                np.testing.assert_allclose(spice.pxform('J2000',alias,et),spice.pxform('J2000',full,et),rtol=0,atol=2e-14)
            rotations.append(spice.pxform('MOON_PA','MOON_ME',et))
            earth=self.engine.state(399,301,et)
            _,lon,lat=spice.reclat(spice.pxform('J2000','MOON_ME',et)@earth.position_km)
            directions.append(np.degrees([lon,lat]))
        for r in rotations:np.testing.assert_allclose(r,rotations[0],rtol=0,atol=2e-14)
        self.assertGreater(np.linalg.norm(rotations[0]-np.eye(3)),1e-5)
        self.assertTrue((np.ptp(directions,axis=0)>1).all())
        self.assertTrue((np.abs(directions)<15).all()) # broad geometric sanity, not apparent-libration reference values

    def test_earth_orientation_coverage_and_no_approximate_fallback(self):
        a,b=self.engine.pck_coverage[3000][0]
        for et in [a+1,b-1]:self.engine.orientation('ITRF93',EPOCHS[2],et)
        for et in [a-1,b+1]:
            with self.assertRaises(ScienceFailure) as ctx:self.engine.orientation('ITRF93',EPOCHS[2],et)
            self.assertEqual(ctx.exception.code,'KERNEL_COVERAGE_ERROR')
        result=self.engine.compute({'operation':'state','utc':'2030-01-01T00:00:00.000Z','targets':[399],'frames':['ITRF93','IAU_EARTH']})
        self.assertEqual(result['orientations']['ITRF93']['status'],'UNAVAILABLE')
        self.assertEqual(result['orientations']['IAU_EARTH']['model'],'GENERIC_IAU_TEXT_PCK')

    def test_rotation_sense_uses_actual_vectors_and_explicit_barycentric_planes(self):
        et=self.engine.time(EPOCHS[2])
        for frame in FRAMES:
            result=self.engine.orientation(frame,EPOCHS[2],et)
            if frame=='IAU_SUN':continue
            sense=result['rotationRelativeToOrbit']
            self.assertEqual(sense['sense'],'RETROGRADE' if frame in ['IAU_VENUS','IAU_URANUS','IAU_PLUTO'] else 'PROGRADE')
            self.assertEqual(sense['usesSystemBarycentrePlane'],frame in ['IAU_MARS','IAU_JUPITER','IAU_SATURN','IAU_URANUS','IAU_NEPTUNE','IAU_PLUTO'])

    def test_invalid_request_does_not_mutate_pool_or_fabricate_output(self):
        for patch in [{'targets':[]},{'targets':[True]},{'frames':['BOGUS']},{'centre':'DISPLAY'},{'aberration':'LT+S'},{'targets':[399,399]}]:
            with self.assertRaises(ScienceFailure):self.engine.compute({'operation':'state','utc':EPOCHS[2],**patch})
        self.assertEqual(self.engine.capabilities()['kernelSetHash'],self.engine.kernel_hash)

    def test_missing_and_tampered_kernel_fail_before_global_pool_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ScienceFailure) as ctx:Engine(directory)
            self.assertEqual(ctx.exception.code,'SCIENCE_KERNEL_MISSING')
            first=self.engine.manifest['kernels'][0];Path(directory,first['filename']).write_bytes(b'bad')
            with self.assertRaises(ScienceFailure) as ctx:Engine(directory)
            self.assertEqual(ctx.exception.code,'SCIENCE_KERNEL_MISMATCH')
        self.assertEqual(self.engine.compute({'operation':'state','utc':EPOCHS[2],'targets':[399]})['status'],'COMPUTED')
