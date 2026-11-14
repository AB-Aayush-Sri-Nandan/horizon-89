# HORIZON 89 — 2–3 minute judge demo

This script uses the working local explorer. It needs no AI key, live JPL response or imported terrain. Keep unavailable states visible; do not promise results that are not loaded.

## Before presenting

From the existing checkout with Node 24 and installed dependencies:

```sh
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Open the forwarded **5173** frontend in your workspace browser. Keep backend 3001 internal. Use Balanced graphics or Low power on modest hardware. Confirm the homepage loads; close unrelated GPU-heavy tabs. The dates/catalog are historical and the project is independent, without NASA affiliation. Keep the scientific sources document available as a backup.

## 0:00–0:25 — Problem and first impression

> “At the lunar south pole, seeing a surface image is not enough to decide whether a site has light, terrain visibility or communications. HORIZON 89 helps visitors explore the context and see exactly which evidence is available—and which is missing.”

Show the homepage: **Beyond Earth. Into the Unknown.** Point out the locally bundled NASA Tycho star visualization and credit. Click **Explore Universe**.

## 0:25–0:55 — Our place in the Solar System

Select Earth, then Jupiter or Saturn. Briefly use **Play orbits**, then pause.

> “This is an exploration atlas, with NASA-sourced display maps where available. Sizes, distances, circular orbits, initial phases and visual spin rates are schematic, not a live ephemeris. Venus’s surface visualization is explicitly false color and opt-in.”

Select **Earth**, then **Moon**. Allow the cinematic approach to enter Mission Control. With reduced motion enabled, entry is immediate.

## 0:55–1:30 — The lunar workspace and mission history

Zoom/rotate the Moon, then use **89°S**. Select **IM-1 · Odysseus**. Open **CLPS intelligence** to compare IM-1, Blue Ghost Mission 1 and Peregrine Mission One. Show the historical snapshot dates and links.

> “Mission history is separate from operational telemetry. We do not plot an exact landing position unless its coordinate evidence has been reviewed. The cyan marker is an analyst’s study location, not a claimed landing site.”

## 1:30–2:10 — A location is a question, not a score

Return to **Mission control**. Enter latitude **−88.5**, east-positive longitude **12.25**, and **Apply target**. Scrub UTC, briefly play/pause, then open **Source & measurement limits**. Visit **Lunar science** or the comparison evidence table.

> “The clock controls the requested UTC instant. Horizons provides calculated airless observer geometry when reachable; it is not measured live telemetry. This cloud currently cannot reach JPL, so the fields remain unavailable. A flat-horizon Earth elevation would still not prove a radio link.”

> “Terrain import and registration validation are implemented, but no reviewed DEM, permanent-shadow mask or terrain illumination product is loaded. We do not turn a dark image pixel into a scientific observation or invent a suitability score.”

## 2:10–2:40 — Assistance, transparency and close

Open **Mission Copilot**. Show its upfront unconfigured state; no generated response is expected. Close it with Escape. Return via **Mission control → Back to Solar System**, then the **HORIZON 89** brand to Home.

> “The platform connects an approachable visual journey to source-aware mission exploration. It works without AI or live upstream data; those integrations add evidence only when available. Next steps are independently validated JPL results, reviewed terrain and landing-coordinate imports, and testing the actual optional Mercury model.”

## Fallback plan

- Missing texture: use the labeled plain material; the catalog and sources still work.
- WebGL unavailable/lost: use the object directory or **Open lunar Mission Control**. **Reload Solar viewer** and the lunar **Reload viewer** action retry the 3D context.
- JPL failure: show the explicit unavailable state. Do not substitute fixture/test numbers.
- No AI key: show the unconfigured state and continue using mission/source panels.
- Mercury GLB absent: retain the existing plain Mercury. Do not call the synthetic automated test fixture the user’s model.

The homepage, planetary imagery and historical mission catalog are local. Scientific source links and live providers still require network access. Test the actual presentation machine before the event; viewport tests are not proof of physical mobile/Safari performance.
