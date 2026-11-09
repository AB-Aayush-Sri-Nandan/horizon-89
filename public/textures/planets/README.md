# Phase 4 planetary source maps

The JPEGs in this folder are actual source maps downloaded over verified HTTPS from NASA's public repositories and re-encoded for display. They are **not AI-generated or procedurally fabricated planetary surfaces**. All source URLs, pinned commits, asset identifiers, dimensions, source/display SHA-256, retrieval times, conversion method and usage notes are in `provenance.json`.

- Earth: NASA WorldWind's `BMNG_world.topo.bathy.200405.3.2048x1024.jpg`, commit `2543c234349c76f4a290e318b49f071ac156d2a0`, 2048×1024. A historical Blue Marble composite with topography/bathymetry; not current clouds/weather or a DEM.
- Mars: NASA 3D Resources `Images and Textures/Mars/Mars.jpg`, 1440×720.
- Jupiter, Saturn, Neptune: same NASA collection, each `Images and Textures/NAME/NAME.jpg`, 720×360.
- Venus: same NASA collection, 1440×720. This is **false-color surface visualization, not natural visible cloud imagery**. It is off by default and explicitly opt-in. The default Venus cloud-colored shell is a plain material with no invented cloud pattern.

NASA 3D Resources revision: `11ebb4ee043715aefbba6aeec8a61746fad67fa7`. Its original README declares assets free/without copyright and links NASA media-usage guidelines; its `meta.json` lists NOSA 1.3. Both source documents are preserved here. The WorldWind repository distributes under Apache 2.0; its actual license PDF is included. NASA media/branding requirements still apply; NASA names/insignia are not used to suggest endorsement.

The collection does not supply original instrument/acquisition/calibration metadata for these older visualization assets. The application calls them historical NASA visualization maps, not certified natural-color observations or live atmospheric data. Venus false color and Earth bathymetry are stated explicitly. No precision geographic registration is asserted for planetary metrics.

No reviewed Sun, Mercury or Uranus map and no separate cloud texture were acquired. Those objects use labeled solid/emissive fallback materials. Rings, atmosphere rims and star points are display geometry/effects, not scientific image/data products. The decorative starfield is not an astrometric catalog. Distances, sizes, circular orbits, initial phases, day counter and lighting are schematic—not true scale or live ephemerides.

Reproduce and verify all six maps with the existing locked Sharp version:

```sh
npm run imagery:prepare
```

The script fetches only pinned NASA-owned GitHub paths, checks source SHA-256, applies max-width 2048 / JPEG quality 90 conversion without synthetic detail and checks the expected display SHA-256 before writing. Do not change expected digests to bypass a mismatch. Raw source copies used during development were kept outside the repository; only small converted visual assets are committed. The requested LROC product has a separate import/provenance workflow and was not silently replaced by these maps.
