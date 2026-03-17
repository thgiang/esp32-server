const WebSocket = require('ws');

const url = 'ws://127.0.0.1:3000/xiaozhi/v1/';
console.log(`Connecting to ${url}...`);

const ws = new WebSocket(url);

ws.on('open', function open() {
  console.log('Connection established (Minimal)!');
  ws.close();
});

ws.on('error', function error(err) {
  console.error('WebSocket Error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log(`Connection closed. Code: ${code}`);
  process.exit(code === 1000 ? 0 : 1);
});

setTimeout(() => {
    console.log('Timing out...');
    ws.terminate();
    process.exit(1);
}, 2000);
