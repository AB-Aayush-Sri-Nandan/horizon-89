# Scientific sources, interpretation and evidence gaps

HORIZON 89 is an independent exploration/education project. Source attribution does not imply NASA affiliation, approval, mission authority or operational readiness. Historical records and display imagery are not live observations. Tests using fabricated mathematical fixtures are transport/processing checks only; fixtures are never shipped as lunar science.

## Evidence vocabulary

| Label | Meaning |
| --- | --- |
| Historical | Curated mission reference at its recorded snapshot date; not a live operational feed |
| Calculated | JPL observer geometry for an exact requested site/UTC, only when a valid response is returned |
| Cached | Previously fetched calculated result bound to the same site/UTC; 5-minute cache, original fetch time retained |
| Schematic / simulated | Display sizes, distances, circular orbits, initial phases, spin rates, decorative stars and user-controlled clock |
| Study / unsurveyed | Analyst-entered coordinate, not a verified landing point or survey |
| Unavailable / not evaluated | No valid reviewed product/result; absence never becomes zero, a score or an observation |

## Mission history and coordinate evidence

The catalog contains **IM-1 · Odysseus**, **Blue Ghost Mission 1**, and **Peregrine Mission One**. `src/data/catalog.ts` records each mission’s source URL, historical `asOf` date, selected objectives/payloads and dated events. The interface displays snapshot dates and source links. Original source access dates are not supplied where they were not recorded; they are not invented in this release.

- [NASA Commercial Lunar Payload Services](https://www.nasa.gov/commercial-lunar-payload-services/)
- Exact NASA mission-specific URLs and per-record dates: `missions[].source` in [catalog.ts](../src/data/catalog.ts).
- Approximate planet orbital-period references: `solarBodies[].source` in that same catalog.

The three shipped missions have **no reviewed exact landing-coordinate record**. `missionCoordinates` withholds a marker unless the as-landed kind, convention, frame/datum, finite coordinates, dates, precision and optional uncertainty/radius evidence are valid. Manual 89°S/0°E and other entered coordinates are study locations. Decimal places do not establish accuracy. Do not infer coordinates from destination-region names.

## Display imagery

| Asset | Source / local provenance | Limitations |
| --- | --- | --- |
| Homepage/Solar background | NASA 3D Resources Tycho Star Map; [space-provenance.json](../public/images/space-provenance.json) | NASA-hosted star visualization; not a telescope exposure/live sky; CSS crop/dimming, no sky alignment claim |
| Earth | NASA WorldWind historical Blue Marble topography/bathymetry composite | Not live clouds/weather; no surface-height derivation |
| Mars, Jupiter, Saturn, Neptune | NASA 3D Resources pinned visualization maps | Historical qualitative display; original instrument/acquisition metadata incomplete; not measured current atmospheric states |
| Venus | NASA 3D Resources false-color surface visualization, opt-in | Distinct from natural visible cloud appearance; plain cloud-colored material by default |
| Moon (current) | Three.js example Moon JPEG; [provenance/license](../public/textures/README.md) | 1024×512 qualitative image; acquisition/registration metadata absent; not asserted to be LROC or a precision terrain map |
| Mercury/Sun/Uranus | Labeled plain fallback material unless a separately reviewed asset is available | No photographic/scientific asset is invented; emissive Sun is a display material |

The six planetary maps retain their hashes, dimensions, exact download URLs, pinned revisions, interpretation and usage records in [planet provenance](../public/textures/planets/provenance.json), with [usage notes](../public/textures/planets/README.md). NASA-hosted imagery remains subject to its media/branding usage guidance; Earth’s WorldWind source also includes its Apache license record. Background source/display hashes are reproducible with `scripts/science/prepare-space-background.mjs`; planet hashes with `npm run imagery:prepare`.

No image brightness is interpreted as elevation, roughness, ice, illumination history or permanent shadow. Scene lighting is studio/display lighting, not the selected simulation UTC. Decorative star points/rims/rings are graphics, not astrometric or measured observations.

## JPL Horizons

- [Horizons API](https://ssd.jpl.nasa.gov/api/horizons.api)
- [Official manual](https://ssd.jpl.nasa.gov/horizons/manual.html)
- [Project verification protocol](science/HORIZONS-VALIDATION.md)

The server requests Sun (`10`) and Earth (`399`) for a geodetic lunar surface observer (`coord@301`), height 0 km, east-positive longitude, quantity 4, airless apparent azimuth/elevation, north-through-east azimuth and explicit UTC. Accepted input years are 1962–2100; older UT output is not silently called UTC. Returned Sun/Earth timestamps and finite degree bounds must match the request. Parser/unit/API/cache tests use explicit upstream fixtures.

**This release environment:** a fresh direct request to official JPL documentation was denied at proxy CONNECT with HTTP 403. The actual application API returned HTTP 503 `NETWORK_ERROR` for 89°S/0°E at `2025-03-02T06:00:00Z`. No real geometry was obtained or independently checked in this pass. This is an access limitation, not proof that JPL is down or that calculated results would be scientifically validated elsewhere. Historical eight-case failed-run records remain in `docs/science/`.

Above-horizon Earth is only a flat-horizon geometric condition, not terrain line of sight, antenna geometry or a radio-link budget. Sun elevation alone is not a surface illumination/PSR result. No fallback numbers replace unavailable geometry.

## Terrain and LROC import architecture

- [PDS Geosciences](https://pds-geosciences.wustl.edu/), [LOLA team](https://lola.gsfc.nasa.gov/)
- [PDS3 ingestion/limitations](science/INGESTION.md) and [candidate inventory](science/candidate-inventory.json)
- [Requested LROC WAC product](https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P)
- [LROC registration/import workflow](science/LROC-IMAGERY.md)

No real reviewed DEM, PSR mask, terrain illumination grid or requested LROC TIFF/IMG is loaded. Candidate paths are leads, not verified products. The constrained PDS3 parser preserves units/no-data, spherical convention, native-grid slope method, reference datum and source hashes; it does not support every PDS format. The optional 2880×1440 WAC display importer rejects unsupported registration/encoding. Both have synthetic-fixture pipeline checks, with **no actual-authoritative-product validation** claimed.

The bounded DEM overlay is nearest display-grid color sampling, not displaced terrain or a surveyed site measurement. Roughness, permanent shadow, ice observations, terrain line of sight, radio coverage and site suitability scores remain unavailable. Importing a reviewed real product requires independent geographic/numerical review; a locally matching hash proves identity, not publisher authenticity or suitability.

## Mercury model and AI

Neither recognized Mercury GLB exists in this workspace. The optional loader/fallback is tested with a labeled synthetic GLB only. No NASA/model license, scientific registration or orientation is inferred from a filename. The actual model must be inspected if supplied later; keep it in ignored `.data/manual-assets/`.

Copilot remains server-side. No key is configured and no real answer was requested or fabricated. If enabled later, generated prose is not a scientific measurement; verify cited sources, model access and actual provider behavior. The system context distinguishes catalog facts, cached sourced geometry, assumptions and unavailable evidence.

## Source access and release claims

Local imagery/provenance links are checked as local assets. Official external links are retained as source references; restricted cloud access prevents certifying that every source page is reachable/current from the judges’ network. Original phase source-access limitations remain visible. No source retrieval date, live result, accreditation or NASA endorsement has been invented to make the release appear complete.
