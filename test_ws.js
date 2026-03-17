const WebSocket = require('ws');

async function testFullSequence(url) {
    return new Promise((resolve) => {
        console.log(`\nTesting full sequence to: ${url}`);
        const ws = new WebSocket(url, {
            headers: {
                'Device-Id': 'test-device'
            }
        });

        let connected = false;

        ws.on('open', function open() {
            console.log(`[SUCCESS] Connection established`);
            connected = true;
            
            // Step 1: Send actual hello message
            const helloMsg = {
                type: 'hello',
                version: 3,
                features: { mcp: true },
                transport: 'websocket',
                audio_params: {
                  format: 'opus',
                  sample_rate: 16000,
                  channels: 1,
                  frame_duration: 60
                }
            };
            console.log('[SENDING] hello');
            ws.send(JSON.stringify(helloMsg));
        });

        ws.on('message', function message(data) {
            try {
                const msg = JSON.parse(data.toString());
                console.log(`[RECEIVED JSON] ${msg.type}`, msg);

                if (msg.type === 'hello') {
                    // Step 2: After receiving server hello, send listen start
                    setTimeout(() => {
                        const listenMsg = {
                            session_id: msg.session_id,
                            type: 'listen',
                            state: 'start',
                            mode: 'auto'
                        };
                        console.log('[SENDING] listen start');
                        ws.send(JSON.stringify(listenMsg));

                        // Step 3: Simulate streaming audio for 2 seconds
                        let count = 0;
                        const interval = setInterval(() => {
                            if (ws.readyState === WebSocket.OPEN && count < 20) {
                                // Send dummy binary audio data
                                const dummyAudio = Buffer.alloc(100, count);
                                ws.send(dummyAudio);
                                count++;
                            } else {
                                clearInterval(interval);
                                // Step 4: Send abort to trigger playback early (before 5s timeout)
                                console.log('[SENDING] abort');
                                ws.send(JSON.stringify({ type: 'abort' }));
                            }
                        }, 100);
                    }, 500);
                }
            } catch (e) {
                // If it's binary data (server response audio)
                if (data instanceof Buffer || data instanceof ArrayBuffer) {
                    const buf = Buffer.from(data);
                    if (buf.length >= 4) {
                        const type = buf.readUInt8(0);
                        const reserved = buf.readUInt8(1);
                        const size = buf.readUInt16BE(2);
                        console.log(`[RECEIVED AUDIO] header(type:${type}, res:${reserved}, size:${size}), total_len: ${buf.length}`);
                    } else {
                        console.log(`[RECEIVED BINARY] size: ${buf.length} bytes (too small for header)`);
                    }
                } else {
                    console.log('[RECEIVED NON-JSON]', data.toString());
                }
            }
        });

        ws.on('error', function error(err) {
            console.error(`[ERROR]: ${err.message}`);
        });

        ws.on('close', function close(code, reason) {
            console.log(`[CLOSED]. Code: ${code}`);
            resolve(connected);
        });

        setTimeout(() => {
            ws.close();
        }, 5000);
    });
}

async function runTests() {
    console.log('--- Full Interaction Tests ---');
    await testFullSequence('ws://127.0.0.1:3000/xiaozhi/v1');
    console.log('\n--- Tests Completed ---');
    process.exit(0);
}

runTests();
