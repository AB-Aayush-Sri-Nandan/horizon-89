# HORIZON 89 build status

## Implemented

- Local illustrative lunar-base homepage asset; no Blue Marble/WebGL Earth is used in the hero.
- Interactive 3D Solar System with illustrative-orbit disclosure.
- Mission Intelligence catalogue with ten records, populated comparison, dated timeline and official source registry.
- NASA-reviewed historical records for IM-1, Blue Ghost Mission 1, IM-2 and Peregrine; planned records remain marked for revalidation.
- Mission-to-Mission-Control flow, selectable mission roster, synchronized lunar marker and explicit no-marker states.
- One AI interface named Mission Copilot. Groq credentials are server-only; there is no browser API-key form.
- Responsive blue/purple operations theme and desktop/mobile browser smoke coverage.

## Data boundaries

- IM-1's 80.13° S, 1.44° E marker is supported by NASA LRO analysis.
- Blue Ghost's 18.56° N, 61.81° E marker is labelled provider-published rather than NASA-verified in this catalogue.
- The reviewed IM-2 NASA article establishes a south-pole landing but not a precise coordinate, so no exact marker is shown.
- Peregrine did not land; the UI deliberately shows no lunar marker.
- JPL Horizons is unavailable from this environment. Solar/Earth azimuth and elevation therefore remain unavailable instead of being simulated.
- No reviewed georeferenced DEM, slope map, permanent-shadow mask or communications model is bundled. Terrain line-of-sight, illumination and communications remain not evaluated.
- The homepage SVG is illustrative artwork, not a NASA photograph or scientific terrain product.

## AI configuration

Set `GROQ_API_KEY` and `GROQ_MODEL` only on the Node server. The real provider call was not run because no Groq key was available. The complete request/response, evidence-citation and credential-isolation flow is covered with a mocked provider test.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:secrets`, and `npm run test:browser`. Browser screenshots are written to `docs/screenshots/`.
