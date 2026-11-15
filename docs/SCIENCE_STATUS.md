# Scientific data status

This registry records what can actually be checked from the current build.
No row below should be read as verification of a live external service.

| Product | Provider / identity | Resolution and coverage | Frame / projection | Imported | Rendered | Verification limit |
| --- | --- | --- | --- | --- | --- | --- |
| Tycho Star Map | NASA 3D Resources; pinned source in `public/images/space-provenance.json` | 2560 × 1280 display, decorative all-sky map | Decorative crop; no astrometric frame used | Yes | Home/Solar background | Hash checked; no live sky claim |
| Blue Marble Next Generation | NASA WorldWind `BMNG_world.topo.bathy.200405.3.2048x1024` | 2048 × 1024 global Earth map | Equirectangular display texture | Yes | Home and Solar | Historical composite, no live weather |
| Other planet maps | NASA 3D Resources pinned revisions in `public/textures/planets/provenance.json` | Per-asset 720–2048 px, global visualization maps | Equirectangular display textures; instrument metadata incomplete | Yes, selected bodies | Solar | Hash checked; scientific calibration unverified |
| Lunar qualitative image | Bundled `public/textures/moon.jpg`; see `public/textures/README.md` | 1024 × 512 global display | Approximate equirectangular display; registration unverified | Yes | Moon if WAC unavailable | Not an elevation or survey product |
| LROC WAC global mosaic | Requested `WAC_GLOBAL_E000N0000_008P`; LROC product page in `docs/science/LROC-IMAGERY.md` | Requested 8 px/degree global product; actual file/coverage not retrieved | Must be verified from source label | No | No | Proxy blocked source retrieval; importer supports a reviewed GeoTIFF only |
| PSR | No specific LOLA/Diviner product selected | Unknown | Unknown | No | No | Dark imagery cannot identify PSR |
| Global lunar albedo | “Global ALGRC” from brief, identity unresolved | Unknown | Unknown | No | No | Do not silently substitute another product |
| LOLA elevation | No reviewed DEM installed; ingestion contract in `docs/science/INGESTION.md` | Unknown until product import | Product-specific lunar datum/projection required | No | No | Synthetic tests prove parser behavior only |
| JPL Horizons lunar observer geometry | JPL Horizons API; observer request in `server/horizons.ts` | Requested point and UTC epoch | Planetocentric east-positive lunar coordinate; output azimuth/elevation | Remote adapter exists | Only on successful request | Hosted egress untested; no fallback telemetry |
| Planetary state vectors | No validated adapter installed | None | Frame, center, plane and time scale not selected | No | No | Solar positions remain explicitly schematic |

The mission research registry contains zero verified evidence records.
Unreviewed leads cannot ground generated Copilot answers or map markers.
