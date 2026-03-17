const http = require('http');

const options = {
  port: 3000,
  host: '127.0.0.1',
  headers: {
    'Connection': 'Upgrade',
    'Upgrade': 'websocket',
    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version': 13,
    'Device-Id': 'test-device'
  },
  path: '/xiaozhi/v1/'
};

const req = http.request(options);

req.on('upgrade', (res, socket, upgradeHead) => {
  console.log('Upgrade successful!');
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  socket.end();
  process.exit(0);
});

req.on('error', (err) => {
  console.error('Request Error:', err.message);
  process.exit(1);
});

req.on('response', (res) => {
  console.log('Response status:', res.statusCode);
  console.log('Response headers:', res.headers);
  res.on('data', (chunk) => {
    console.log('Body:', chunk.toString());
  });
});

req.end();
