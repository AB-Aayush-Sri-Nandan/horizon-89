# Render readiness and hosted verification

The production Node service uses Node 24, `npm ci && npm run build`, `npm start`,
and `/api/health`. Render supplies `PORT`; leave `HOST` unset or set it to
`0.0.0.0`. The health response establishes process liveness and does not claim
that JPL, AI providers, or scientific datasets are available.

## Session and abuse controls

Research-provider keys are held only in one process's memory for 30 minutes.
Both API rate limiters are process-local and currently key on the socket peer,
which may be Render's proxy rather than the visitor. A restart loses sessions;
multiple instances do not share them. A user can hit a different instance and
appear signed out, while a caller can spread requests across instances. Do not
use the current counters as the sole protection for a public paid AI key.

For multiple instances, use a shared TTL store such as Redis/Render Key Value
for session records and atomic distributed rate limits. Encrypt provider keys
before writing them to that store using a separately managed application key;
restrict store access, use TLS, apply a 30-minute TTL, rotate session IDs on
updates, and delete records on logout. Store the encryption key only in Render
secret settings. Do not trust an arbitrary `X-Forwarded-For` header as a client
identity; accept it only through a trusted edge/proxy configuration.

Before enabling `H89_AI_API_KEY` publicly, require edge request throttling
for `/api/copilot`, `/api/session/*`, and `/api/research/copilot`, plus an
authenticated or otherwise enforceable per-user quota for paid generation.
Limit request body sizes and concurrent provider requests at the edge. Keep
HTTPS redirect enabled. The production cookie is always `Secure`, `HttpOnly`,
`SameSite=Strict`, and scoped to `/api`; forwarded-protocol headers are ignored
for origin validation. Verify these headers on the actual hosted service.
No shared store, paid service, credential, or production setting is provisioned
by this repository.

## Live provider smoke tests on staging

Run these commands in a staging service shell after configuring its egress and
secrets. Keep generated raw files in ephemeral storage; review scientific
results separately before using them as evidence.

```sh
npm run science:verify-horizons -- /tmp/h89-horizons-check
H89_API_BASE_URL="http://127.0.0.1:$PORT" npm run test:ai:live
```

The first command requests eight fixed lunar observer cases from
`ssd.jpl.nasa.gov` and writes a report under `/tmp/h89-horizons-check`. A
successful fetch is transport verification, not independent ephemeris
validation. Confirm outbound HTTPS, DNS, proxy and CA trust if it fails. The
second command requires `H89_AI_API_KEY` in staging secret settings, contacts
the running same-origin API, and reports only response metadata. It skips
explicitly without a key. Inspect answer quality and citations separately;
do not paste credentials or generated answers into build logs. The dedicated
research assistant can test OpenAI or Gemini model discovery through its
HTTPS UI with a temporary credential. Its evidence-backed answer path cannot
generate until reviewed records are imported.

## Evidence and terrain gates

`server/evidence.json` currently has ten pending leads and zero verified
records. The research Copilot deliberately reports unavailable rather than
inventing an answer. A record must have reviewed provenance and a verification
date before it can ground generation. No reviewed LOLA terrain product has
been imported, so elevation, slope, hazard and terrain-shadow conclusions
remain unavailable. Follow [the DEM import guide](science/INGESTION.md) and
validate the real product before enabling those layers. Do not treat the
health endpoint or synthetic fixture tests as evidence of live science.
