# HORIZON 89

**Beyond Earth. Into the Unknown.** An independent lunar exploration and mission research workspace. This project is not affiliated with or endorsed by NASA.

The app includes an illustrative 3D Solar System, a procedural lunar globe with coordinate navigation and spherical distance measurement, a CLPS research index, a landing evidence workbench, a relationship graph, mission control, and a session based AI research interface. Scientific data and imagery are only marked available when a source has been checked.

## Run locally

Use Node.js 24 and npm 11. Install exactly from the lockfile, then start the frontend and local API:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/` locally. The frontend runs on port 5173 and proxies `/api` to the Node backend on port 3001. `npm run dev:frontend` and `npm run dev:api` start them separately. Run `npm run build`, `npm run lint`, and `npm test` for validation.

## Data and evidence status

The repository does not contain a verified global Moon image, lunar elevation model, ephemeris service, or complete CLPS records. The 3D surfaces and orbital movement are labeled illustrative. The lunar globe's measured distance is a spherical great circle using the mean lunar radius of 1,737.4 km; it is not a terrain route. Landing suitability remains **Not evaluated** until source data is imported. `/api/horizons` returns a clear unavailable response.

The CLPS names in [src/data/missions.ts](src/data/missions.ts) are leads from the project brief. Current mission dates, statuses, payloads and coordinates have not been confirmed. Source links are indexed for research, but a link alone does not verify a record. The backend reads [server/evidence.json](server/evidence.json) and excludes pending records from AI answers. See [build status](docs/HORIZON89_BUILD_STATUS.md) for current validation and blockers.

## Temporary AI credentials

In Copilot, open the lock settings or submit exactly `API KEY`. The command opens the settings modal and does not enter chat history. The backend holds a provider key in server memory for at most 30 minutes and identifies the session with an HttpOnly, SameSite cookie. No key is stored in browser storage or repository files. Test connection discovers compatible models from OpenAI or Google Gemini. The provider request will require access to `api.openai.com` or `generativelanguage.googleapis.com`; the cloud environment draft includes these destinations for review. Use HTTPS for any remote deployment. With no verified matching evidence, Copilot reports the gap and does not ask a model to invent an answer. See [server README](server/README.md) for API details.

## Source import next steps

The current cloud instance blocks `nasa.gov` and `science.nasa.gov` with proxy CONNECT 403. These domains are in the saved environment draft for review. Once network access is available, check the official NASA CLPS deliveries, provider and NASA Science pages; reconcile each task order, flight, mission event and payload with dated source records. Acquire licensed, projection checked lunar imagery and DEM products before enabling geographic science layers. Do not turn research leads into confirmed map markers without a source for their coordinates.
