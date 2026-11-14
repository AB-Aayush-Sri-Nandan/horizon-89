# HORIZON 89 local API

The production Node server in `server/index.ts` mounts this research API's session routes and `/api/research/copilot` alongside its mission-platform routes. `npm run build:server` copies this module and `evidence.json` into `dist-server/server/`. The standalone command below remains available for research API development.

From the repository root, start with `node --use-env-proxy server/index.mjs`. The
API binds to `127.0.0.1:3001` by default, where Vite already proxies `/api`.
Node's `--use-env-proxy` flag makes provider calls use the cloud environment's
configured HTTPS proxy and trust settings. Provider egress requires
`api.openai.com` and/or `generativelanguage.googleapis.com` to be permitted by
the environment network policy.

The routes are:

| Method/path | Purpose |
| --- | --- |
| `GET /api/health` | API readiness and count of verified evidence records. |
| `GET /api/horizons` | Explicit 503 until a validated ephemeris service exists. |
| `GET /api/session/config` | Session configuration status; never returns key. |
| `POST /api/session/test` | `{provider,key}` checks key and lists model IDs without storing it; `{}` checks the saved session. |
| `POST /api/session/config` | `{provider,key,model?}` stores key in server memory for 30 minutes. An existing session can send `{model}` to update selection. |
| `DELETE /api/session/config` | Erases the key from server memory and expires the cookie. |
| `POST /api/copilot` | `{message,context?}` retrieves verified local facts and returns `{answer,citations,dataState}`. |
| `POST /api/research/copilot` | Same research contract on the combined production server; `/api/copilot` there serves the mission-platform contract. |

`provider` is `openai` or `gemini`. The model selector should use IDs returned
by the test endpoint; no model is silently chosen. All mutating requests need
an allowed `Origin` header. Local Vite origins are allowed. For other hosts,
set `HORIZON_ALLOWED_ORIGINS` to a comma-separated list of exact trusted
origins. If deployed behind an HTTPS proxy, forward `X-Forwarded-Proto: https`
so the opaque session cookie receives the `Secure` flag. Use HTTPS in
production. `HORIZON_HOST` and `HORIZON_PORT` can change the bind address and
port.

The evidence registry is `server/evidence.json`. Only entries with
`verification: "verified"`, `verifiedAt`, `fact`, `title`, and an HTTPS `url`
can ground a generated answer. Research leads marked pending are excluded.
The server sends keys only to the fixed provider hosts in the adapters, never
to an arbitrary URL. It does not persist or log credentials. The session is
lost when the process stops. Run checks with `node --test server/index.test.mjs`.
