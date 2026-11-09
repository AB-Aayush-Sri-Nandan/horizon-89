# Real Copilot setup and verification

`H89_AI_API_KEY` remains server-only. The default `H89_AI_MODEL=gpt-4.1-mini` is unchanged. No key is configured in the development environment used for this phase, so real-answer workflows were **skipped**, not described as passing.

## Codespaces secrets

In GitHub account/repository settings, open **Codespaces → Secrets → New secret**, name it `H89_AI_API_KEY`, and grant access only to the intended repository. Enter its value securely there, never chat or source. Restart the Codespace so the secret is injected, then start the backend/dev command. For local development, an ignored `.env` based on `.env.example` is supported; never use a `VITE_` variable for credentials. `H89_AI_MODEL` may be supplied separately for a model available to the account.

The server needs HTTPS access to `api.openai.com`, preserving platform proxy and CA trust. A configured key or `/api/health` does not establish valid authentication, model access or successful generation. No key is sent in browser request bodies, manifests, screenshots or application logs.

## Run an actual response smoke test

Start the application with the same secure environment, then:

```sh
npm run test:ai:live
```

The script checks presence without printing the key, confirms backend configuration and submits one contextual question through `/api/copilot`. It accepts only a real nonempty provider response marked AI-generated, prints character/source-reference counts rather than key/answer contents, and fails on timeout/provider/API errors. With no key it explicitly prints `SKIPPED` and makes no AI request. `H89_API_BASE_URL` can select a different local backend when needed.

The browser suite also contains **real Copilot response only when a server key is configured**. It checks backend configuration and skips explicitly if missing. When configured, it exercises the actual UI submission and generated answer. Test transport fixtures in unit tests remain separate from this real-response workflow.

Review generated scientific text manually: source references do not make a model authoritative. The system context includes actual selected mission/comparison, analyst coordinate, UTC, matching cached JPL geometry only when present, terrain availability/provenance, lunar imagery status and selected Solar object. Missing terrain, shadow products, georegistration and live sources must remain unavailable. The model must not invent measurements or claim that inaccessible NASA/JPL sources were queried.
