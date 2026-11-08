# HORIZON 89 · Project description

Lunar south-pole exploration needs more than an impressive globe. Analysts must know where a number came from, when it applies, and what the available data cannot establish. Imagery, flat-horizon geometry, terrain shadow and radio-link availability answer different questions.

HORIZON 89 combines a responsive lunar mission-control interface, a genuine Moon image map, a historical CLPS catalog, UTC exploration controls and source-aware observer telemetry. A dedicated science workspace makes missing datasets visible. A separate 3D Solar System atlas provides a broader educational context. A server-side AI Copilot can explain the catalog and dataset limitations when configured.

The distinguishing feature is scientific restraint made useful: unknown landing coordinates stay unplotted; unavailable ephemerides stay unavailable; image brightness never becomes invented topography; geometric Earth visibility never becomes a promised communications link. Exploration remains usable offline while remote integrations recover gracefully.

The application uses React, TypeScript, Vite and React Three Fiber, with lazy 3D modules and a small native Node API. Shared typed records connect mission selection, historical events, source references and AI context. Validation, timeouts, cache limits and automated browser checks support a credible demonstration on ordinary hardware.

Future development should ingest independently verified landing-site records, cross-check live JPL output, integrate georeferenced LOLA terrain and validated shadow products, and evaluate communications using actual terrain and link-budget inputs. Those are explicit next capabilities, not claims about the current product. HORIZON 89 is independent and does not imply NASA affiliation.

## Phase 2: evidence infrastructure

The platform now adds a fail-closed PDS3 DEM ingestion path, preserved source labels/hashes/datum review, bounded optional polar elevation/slope color layers, explicit shadow-product availability, and a comparison matrix that exposes missing evidence instead of manufacturing a suitability score. Native-raster slope computation and lunar projection transforms are covered by mathematical and end-to-end binary-fixture tests. Horizons now rejects wrong returned timestamps and has a reproducible eight-case upstream/reference-verification protocol. Copilot receives broader mission comparison, terrain availability and provenance context.

The strongest verified Phase 2 capability is the integrity of this workflow and its failure behavior. No real authoritative DEM or new exact landing-coordinate record was obtainable under the current network policy, and neither live JPL accuracy nor real AI generation was verified. Synthetic test fixtures are confined to tests. The product remains independently branded, usable offline and explicit about the difference between an implemented integration and validated scientific observations.
