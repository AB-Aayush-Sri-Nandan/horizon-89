import express from 'express';
import type { ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { HorizonsService, parseObserverQuery } from './horizons.ts';
import { ApiError } from './errors.ts';

export interface AppOptions {
  service?: Pick<HorizonsService, 'geometry'>;
  logger?: (entry: Record<string, unknown>) => void;
  now?: () => number;
  rateLimit?: number;
}
export function createApp(options: AppOptions = {}) {
  const app = express(); const service = options.service ?? new HorizonsService();
  const now = options.now ?? Date.now;
  const logger = options.logger ?? (entry => console.error(JSON.stringify(entry)));
  const requests = new Map<string, {count: number; until: number}>();
  app.disable('x-powered-by'); app.set('query parser', 'simple'); app.set('trust proxy', false);
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.set({'X-Request-Id': res.locals.requestId, 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"});
    if (req.path === '/api/health') { next(); return; }
    const timestamp = now();
    for (const [key, entry] of requests) if (entry.until <= timestamp) requests.delete(key);
    const key = req.ip || 'unknown'; let entry = requests.get(key);
    if (!entry) {
      if (requests.size >= 1024) { res.set('Retry-After', '60'); next(new ApiError('RATE_LIMITED', 'Request capacity exceeded.', 429, true)); return; }
      entry = {count: 0, until: timestamp + 60_000}; requests.set(key, entry);
    }
    if (++entry.count > (options.rateLimit ?? 60)) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entry.until - timestamp) / 1000))));
      next(new ApiError('RATE_LIMITED', 'Request rate limit exceeded.', 429, true)); return;
    }
    next();
  });
  app.use(express.json({limit: '8kb', strict: true}));
  app.get('/api/health', (_req, res) => res.json({status: 'OK', service: 'horizon89-api',
    scienceProvider: 'JPL_HORIZONS', upstreamChecked: false, copilot: 'UNAVAILABLE'}));
  app.get('/api/horizons', async (req, res) => {
    const result = await service.geometry(parseObserverQuery(req.query));
    res.json({...result, requestId: res.locals.requestId});
  });
  app.post('/api/copilot', (req, _res, next) => {
    if (typeof req.body?.message !== 'string' || !req.body.message.trim() || req.body.message.length > 2000 ||
        Object.keys(req.body).some(k => k !== 'message')) {
      next(new ApiError('VALIDATION_ERROR', 'Provide a nonempty message of at most 2000 characters.', 400)); return;
    }
    // Compatibility only. Never activate providers or echo keys/prompts in this phase.
    next(new ApiError('SCIENCE_SERVICE_UNAVAILABLE', 'Mission Copilot is unavailable; AI providers are not enabled in this phase.', 503));
  });
  app.use((_req, _res, next) => next(new ApiError('VALIDATION_ERROR', 'API route not found.', 404)));
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    let failure: ApiError;
    if (error instanceof ApiError) failure = error;
    else if (error && typeof error === 'object' && 'type' in error &&
      ['entity.parse.failed', 'entity.too.large'].includes(String(error.type))) {
      failure = new ApiError('VALIDATION_ERROR', 'Invalid or oversized JSON body.', error.type === 'entity.too.large' ? 413 : 400);
    } else failure = new ApiError('INTERNAL_ERROR', 'The API could not complete this request.', 500, true);
    logger({event: 'api_error', requestId: res.locals.requestId, code: failure.code,
      ...(failure.diagnostic ? {upstreamDiagnostic: failure.diagnostic} : {})});
    res.status(failure.httpStatus).json({status: 'UNAVAILABLE', requestId: res.locals.requestId,
      error: {code: failure.code, message: failure.message, retryable: failure.retryable}});
  };
  app.use(errorHandler); return app;
}
