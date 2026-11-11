const { fork } = require('child_process');
const path = require('path');

console.log('[START-ALL] Launching PulseGate Gateway (port 4000) and Trusted Upstream (port 4001)...');

const upstreamProcess = fork(path.resolve(__dirname, '../src/upstream/upstreamServer.js'), [], {
  env: { ...process.env, PORT: '4001' }
});

const gatewayProcess = fork(path.resolve(__dirname, '../src/server.js'), [], {
  env: { ...process.env, PORT: '4000' }
});

function handleExit(signal) {
  console.log(`[START-ALL] Received ${signal}. Terminating child processes...`);
  upstreamProcess.kill();
  gatewayProcess.kill();
  process.exit(0);
}

process.on('SIGINT', () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));

upstreamProcess.on('exit', (code) => {
  if (code !== 0) console.error(`[START-ALL] Upstream exited with code ${code}`);
});

gatewayProcess.on('exit', (code) => {
  if (code !== 0) console.error(`[START-ALL] Gateway exited with code ${code}`);
});

