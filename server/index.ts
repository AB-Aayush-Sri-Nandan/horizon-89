import { createApp } from './app.ts';
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
const app=createApp();
const server = app.listen(port, '127.0.0.1', () => console.log(`Horizon 89 API listening on 127.0.0.1:${port}`));
server.requestTimeout = 20_000;
server.headersTimeout = 10_000;
server.on('error', error => { console.error(`API startup failed: ${error.message}`); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  app.locals.closeScience();
  console.log(`API shutting down (${signal})`);
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 5000).unref();
});
