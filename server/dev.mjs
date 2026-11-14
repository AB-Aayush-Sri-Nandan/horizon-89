import { spawn } from 'node:child_process';

const children = new Set();
let stopping = false;

function start(name, args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env });
  children.add(child);
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (stopping) return;
    stopping = true;
    process.stderr.write(`${name} stopped (${signal || code}). Stopping development services.\n`);
    for (const running of children) running.kill('SIGTERM');
    process.exitCode = code || 1;
  });
  child.on('error', (error) => {
    process.stderr.write(`Could not start ${name}: ${error.message}\n`);
    stop();
  });
}

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start('API', ['--use-env-proxy', 'server/index.mjs']);
start('Vite', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort', ...process.argv.slice(2)]);
