import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { AudioStreamer } from './audio.streamer';

@WebSocketGateway({
  path: '/xiaozhi/v1',
  transports: ['websocket'],
})
export class AudioGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private readonly audioStreamer: AudioStreamer) { }

  private sessions = new Map<WebSocket, { isListening: boolean; timer?: NodeJS.Timeout; sessionId?: string }>();

  handleConnection(client: WebSocket, ...args: any[]) {
    console.log('Client connected WS');
    this.sessions.set(client, { isListening: false });
    
    client.on('message', (rawContent, isBinary) => {
      if (isBinary) {
        const session = this.sessions.get(client);
        if (session?.isListening) {
            // Process binary audio here (e.g. pipe to STT engine)
            // console.log('[WS] Received audio chunk:', rawContent.length, 'bytes');
        }
        return;
      }

      try {
        const data = JSON.parse(rawContent.toString());
        console.log('[WS] Received:', data.type || 'unknown', data);

        switch (data.type) {
          case 'hello':
            this.handleHello(client, data);
            break;
          case 'listen':
            this.handleListen(client, data);
            break;
          case 'abort':
            console.log('[WS] Client aborted');
            this.stopListeningAndPlay(client);
            break;
          case 'ping':
            this.handlePing(client, data);
            break;
          case 'iot':
            console.log('[WS] IOT Message:', data.descriptors);
            // Handle device control logic here
            break;
          case 'mcp':
            console.log('[WS] MCP Message:', data.command);
            // Handle Model Context Protocol commands
            break;
          case 'server':
            console.log('[WS] Server Command:', data.action);
            // Handle server-side actions like restart, update_config
            break;
          default:
            console.log('[WS] Unhandled message type:', data.type);
        }
      } catch (e) {
        console.log('[WS] Received non-JSON text message');
      }
    });
  }

  private handleHello(client: WebSocket, data: any) {
    console.log('[WS] Handling hello');
    const serverHello = {
      type: "hello",
      version: 3,
      transport: "websocket",
      session_id: "session_" + Math.random().toString(36).substr(2, 9),
      audio_params: {
        format: "opus",
        sample_rate: 16000,
        channels: 1,
        frame_duration: 60
      }
    };
    const session = this.sessions.get(client);
    if (session) {
        session.sessionId = serverHello.session_id;
    }

    client.send(JSON.stringify(serverHello));

    // Send initial TTS
    setTimeout(() => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "tts", state: "start" }));
        client.send(JSON.stringify({ type: "tts", state: "sentence_start", text: "Xin chào, tôi đang nghe đây..." }));
      }
    }, 500);
  }

  private handleListen(client: WebSocket, data: any) {
    if (data.state === 'start') {
        console.log('[WS] Started listening (5s timeout)');
        const session = this.sessions.get(client);
        if (session) {
            session.isListening = true;
            if (session.timer) clearTimeout(session.timer);
            session.timer = setTimeout(() => {
                console.log('[WS] Listening timeout reached');
                this.stopListeningAndPlay(client);
            }, 5000);
        }
    } else if (data.state === 'stop') {
        console.log('[WS] Client stopped listening');
        this.stopListeningAndPlay(client);
    } else if (data.state === 'detect') {
        console.log('[WS] Client detected text:', data.text);
        // If client sends pre-recognized text (STT on client side)
        this.stopListeningAndPlay(client);
    }
  }

  private handlePing(client: WebSocket, data: any) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
            type: "pong",
            timestamp: new Date().toISOString()
        }));
    }
  }

  private stopListeningAndPlay(client: WebSocket) {
    const session = this.sessions.get(client);
    if (session) {
        session.isListening = false;
        if (session.timer) {
            clearTimeout(session.timer);
            delete session.timer;
        }
    }

    if (client.readyState === WebSocket.OPEN) {
        console.log('[WS] Playing response audio');
        
        // Send TTS START sequence
        client.send(JSON.stringify({ 
            type: "tts", 
            state: "start", 
            session_id: session?.sessionId 
        }));
        
        client.send(JSON.stringify({ 
            type: "tts", 
            state: "sentence_start", 
            text: "Đây là âm thanh phản hồi từ server.",
            session_id: session?.sessionId 
        }));

        this.audioStreamer.startStreaming(client, 'files/sample.mp3');
    }
  }

  handleDisconnect(client: WebSocket) {
    console.log('Client disconnected WS');
    const session = this.sessions.get(client);
    if (session?.timer) clearTimeout(session.timer);
    this.sessions.delete(client);
    this.audioStreamer.stopStreaming(client);
  }

  afterInit(server: Server) {
    console.log('[WS] Gateway initialized');
  }
}
