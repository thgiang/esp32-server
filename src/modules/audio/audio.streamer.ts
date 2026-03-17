import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { WebSocket } from 'ws';
import * as path from 'path';
import OpusScript from 'opusscript';

@Injectable()
export class AudioStreamer {
  private activeStreams = new Map<WebSocket, any>();
  private readonly SAMPLE_RATE = 16000;
  private readonly CHANNELS = 1;
  private readonly FRAME_DURATION = 60; // ms
  private readonly CHUNK_SIZE = (this.SAMPLE_RATE * this.FRAME_DURATION / 1000) * 2; // 960 samples * 2 bytes = 1920 bytes

  startStreaming(client: WebSocket, filePath: string) {
    if (this.activeStreams.has(client)) {
      this.stopStreaming(client);
    }

    const absolutePath = path.resolve(process.cwd(), filePath);
    console.log(`[AudioStreamer] Starting to stream ${absolutePath}`);

    // Initialize Opus Encoder
    const encoder = new OpusScript(this.SAMPLE_RATE, this.CHANNELS, OpusScript.Application.VOIP);

    const command = ffmpeg(absolutePath)
      .noVideo()
      .format('s16le')
      .audioChannels(this.CHANNELS)
      .audioFrequency(this.SAMPLE_RATE)
      .on('error', (err) => {
        console.error('[AudioStreamer] FFmpeg error:', err.message);
        this.stopStreaming(client);
      })
      .on('end', () => {
        isFmStreamEnded = true;
        console.log('[AudioStreamer] FFmpeg stream ended');
      });

    const ffStream = command.pipe();
    const frameQueue: Buffer[] = [];
    let isStreamingActive = true;

    let isFmStreamEnded = false;

    const sendFrames = () => {
      if (!isStreamingActive || client.readyState !== WebSocket.OPEN) return;

      if (frameQueue.length > 0) {
        const packet = frameQueue.shift();
        if (packet) client.send(packet, { binary: true });
        setTimeout(sendFrames, this.FRAME_DURATION);
      } else if (isFmStreamEnded) {
        // All frames sent and stream ended
        console.log('[AudioStreamer] All frames sent');
        client.send(JSON.stringify({ type: "tts", state: "stop" }));
        this.stopStreaming(client);
      } else {
        // Wait a bit and check again
        setTimeout(sendFrames, 10);
      }
    };

    // Start the sender loop
    setTimeout(sendFrames, this.FRAME_DURATION);

    this.activeStreams.set(client, { 
      command, 
      encoder, 
      stop: () => { isStreamingActive = false; } 
    });

    let pcmBuffer = Buffer.alloc(0);

    ffStream.on('data', (chunk: Buffer) => {
      if (!isStreamingActive || client.readyState !== WebSocket.OPEN) return;

      pcmBuffer = Buffer.concat([pcmBuffer, chunk]);

      while (pcmBuffer.length >= this.CHUNK_SIZE) {
        const frame = pcmBuffer.subarray(0, this.CHUNK_SIZE);
        pcmBuffer = pcmBuffer.subarray(this.CHUNK_SIZE);

        try {
          const opusFrame = encoder.encode(frame, this.CHUNK_SIZE / 2);
          
          // Protocol 3 Header: [Type:0 (Audio), Reserved:0, Size:uint16BE]
          const header = Buffer.alloc(4);
          header.writeUInt8(0, 0); // type
          header.writeUInt8(0, 1); // reserved
          header.writeUInt16BE(opusFrame.length, 2); // payload_size
          
          frameQueue.push(Buffer.concat([header, opusFrame]));
        } catch (err) {
          console.error('[AudioStreamer] Encoding error:', err.message);
        }
      }
    });
  }

  stopStreaming(client: WebSocket) {
    const streamInfo = this.activeStreams.get(client);
    if (streamInfo) {
      console.log('[AudioStreamer] Stopping stream for client');
      if (streamInfo.stop) streamInfo.stop();
      if (streamInfo.command && streamInfo.command.kill) {
        streamInfo.command.kill();
      }
      if (streamInfo.encoder) {
        streamInfo.encoder.delete();
      }
      this.activeStreams.delete(client);
    }
  }
}
