"""Export actual local calculations; no network, reference fixtures or visualization transforms."""
from pathlib import Path
import json
import sys
import numpy as np
import spiceypy as spice
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'app'))
from engine import Engine, FRAMES
engine=Engine()
caps=engine.capabilities()
for body in caps['bodies']:
    body['coverageCalendarTDB']=[[spice.etcal(a),spice.etcal(b)] for a,b in body['coverageET']]
for frame in caps['frames']:
    if frame['coverageET']:
        frame['coverageCalendarTDB']=[[spice.etcal(a),spice.etcal(b)] for a,b in frame['coverageET']]
epochs=['2000-01-01T12:00:00.000Z','2010-06-01T00:00:00.000Z','2026-10-10T06:00:00.123Z']
results=[engine.compute({'operation':'state','utc':utc,'centre':'SUN','targets':[10,199,299,399,301,4,5,6,7,8,9],'frames':list(FRAMES)}) for utc in epochs]
libration=[]
for utc in ['2026-10-01T00:00:00.000Z','2026-10-08T00:00:00.000Z','2026-10-15T00:00:00.000Z','2026-10-22T00:00:00.000Z']:
    et=engine.time(utc);earth=engine.state(399,301,et)
    _,lon,lat=spice.reclat(spice.pxform('J2000','MOON_ME',et)@earth.position_km)
    libration.append({'utc':utc,'subEarthLongitudeDegreesEast':float(np.degrees(lon)),'subEarthLatitudeDegrees':float(np.degrees(lat)),
                      'method':'Geometric Earth-centre direction in MOON_ME; not apparent libration or a physical/optical decomposition.'})
path=Path(__file__).resolve().parents[1]/'evidence'/'phase-2a-results.json'
path.write_text(json.dumps({'capabilities':caps,'statesAndOrientations':results,'geometricSubEarthDirections':libration,
                            'crossValidation':'Internal CSPICE consistency and numerical invariants only; independent Horizons validation blocked and not retried.'},indent=2)+'\n')
print(path.name,path.stat().st_size,'bytes')
print('ET reference:',engine.time(epochs[-1]))
print('Moon relative Earth:',engine.state(301,399,engine.time(epochs[-1])))
print('Geometric sub-Earth directions:',json.dumps(libration))
