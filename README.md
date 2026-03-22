# WebSocket Life Cycle (Giao thức Xiaozhi)

Dưới đây là vòng đời của kết nối WebSocket giữa ESP32 (Client) và Server:

### 1. Giai đoạn Bắt tay (Handshake)
- **Client -> Server**: `{"type": "hello", "version": 3, ...}`
- **Server -> Client**: `{"type": "hello", "session_id": "...", "audio_params": {...}}`
  - *Server cấp session_id và xác nhận các tham số âm thanh (thường là Opus, 16000Hz).*

### 2. Giai đoạn Tương tác Giọng nói (Interaction)
- **Client -> Server**: `{"type": "listen", "state": "start", "mode": "auto"}` (Bắt đầu thu âm)
- **Client -> Server**: Gửi dữ liệu nhị phân (Binary) - Các gói tin âm thanh Opus từ Micro.
- **Client -> Server**: `{"type": "listen", "state": "stop"}` (Dừng thu âm khi VAD nhận diện im lặng)
- **Server -> Client**: `{"type": "tts", "state": "start"}` (Server chuẩn bị phản hồi)
- **Server -> Client**: `{"type": "tts", "state": "sentence_start", "text": "..."}` (Gửi văn bản phản hồi)
- **Server -> Client**: Gửi dữ liệu nhị phân (Binary) - Âm thanh phản hồi từ Server.
- **Server -> Client**: `{"type": "tts", "state": "stop"}` (Kết thúc phát âm thanh)

### 3. Giai đoạn Ngắt quãng / Hủy (Interruption)
- **Client -> Server**: `{"type": "abort"}`
  - *Dùng khi người dùng bấm nút dừng hoặc muốn ngắt lời AI. Server sẽ xóa hàng đợi và dừng nén/phát âm thanh ngay lập tức.*

### 4. Giai đoạn Duy trì (Maintenance)
- **Client -> Server**: `{"type": "ping"}`
- **Server -> Client**: `{"type": "pong", "timestamp": "..."}`
  - *Để giữ kết nối không bị timeout (Heartbeat).*

### 5. Các loại tin nhắn khác
- `iot`: Điều khiển thiết bị (Smart Home).
- `mcp`: Giao thức ngữ cảnh mô hình (Model Context Protocol).
- `server`: Các lệnh quản trị (restart, update_config).

---

## Project setup
```bash
$ npm install
```

## Compile and run the project
```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Core Technology Stack (Legacy Reference)

Dựa trên nghiên cứu từ `esp32-server-legacy`, dưới đây là các công nghệ và model mặc định được sử dụng để xử lý tương tác âm thanh:

### 1. Audio Input Flow
*   **Protocol**: WebSocket (Opus/PCM 16kHz).
*   **VAD (Voice Activity Detection)**: Sử dụng model **Silero VAD** để nhận biết khi nào người dùng bắt đầu và kết thúc nói.
*   **Buffering**: Dữ liệu được tích lũy trong buffer khi VAD phát hiện có tiếng người, và chỉ gửi đi nhận dạng (ASR) khi người dùng ngừng nói hoàn toàn (Voice Stop).
*   **ASR Processing**: Giải mã Opus -> PCM -> ASR Engine.

### 2. Default AI Models
*   **VAD**: `snakers4/silero-vad`
*   **ASR (STT)**: `FunASR` (Model mặc định: **SenseVoiceSmall**)
*   **LLM**: `ChatGLM` (Model mặc định: **glm-4-flash**)
*   **TTS**: `EdgeTTS` (Model mặc định: **zh-CN-XiaoxiaoNeural**)