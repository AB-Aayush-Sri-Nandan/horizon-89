# cPanel Node 24 staging runbook

This is a deployment preparation guide, not evidence of a hosted test.
HORIZON 89 is a full-stack service; uploading `dist/` alone to `public_html`
will not serve its API or Copilot sessions.

## Build and start

1. Select Node.js 24 in Application Manager and point the application root to
   the repository checkout. Use a private staging subdomain and HTTPS.
2. Run `npm ci && npm run build`. The startup file is
   `dist-server/server/index.js`; `npm start` runs it with `NODE_ENV=production`.
3. Let the host supply `PORT`. Set `HOST=0.0.0.0` if its proxy requires it.
   Keep the UI and `/api` on the **same** public origin. Preserve the public
   `Host` header through the proxy. Set `HORIZON_PUBLIC_ORIGIN` to the exact
   HTTPS staging origin, and later to `https://horizon89.earth` only when that
   domain is actually routed and TLS is working.
4. Check `GET /api/health` for liveness and `GET /api/ready` for the built
   service. Check `/`, `/#moon`, `/#missions`, and a static texture. These
   checks do not prove external JPL or AI connectivity.

## Secrets and access

`H89_AI_API_KEY` and `H89_AI_MODEL` are optional server-side settings for the
mission Copilot. The dedicated research Copilot can accept a temporary OpenAI
or Gemini key through its HTTPS session UI; it remains in one Node process's
memory for 30 minutes. Neither JPL Horizons nor the current static NASA maps
require an API key. Store credentials in cPanel's private environment settings,
never in Git, `public_html`, or a frontend `VITE_` variable. A public paid key
needs edge throttling and enforceable per-user quotas before activation.

Sessions and both rate limiters are process-local. Run one instance until a
shared TTL store, encryption key and distributed limiter are implemented and
tested. Do not trust client supplied `X-Forwarded-For` as a visitor identity.

## Rollback and backup

Keep the previous known-good commit and its built artifacts. To roll back,
build that commit in a separate private release directory, point Application
Manager back to its startup file, restart, then recheck health, deep links and
API. Back up private settings and reviewed science manifests separately; do
not place secrets or raw science imports in the public asset directory.

## Current blockers

No reviewed LROC WAC, PSR, albedo or LOLA product is installed. Research
evidence has zero verified records, so evidence-backed answers remain disabled.
JPL and live AI egress have not been verified on cPanel. The Solar atlas uses
schematic positions and must not be described as a real-time ephemeris view.
