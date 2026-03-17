import { Module } from '@nestjs/common';
import { AudioService } from './audio.service';
import { AudioController } from './audio.controller';
import { AudioGateway } from './ws.gateway';
import { AudioStreamer } from './audio.streamer';

@Module({
  controllers: [AudioController],
  providers: [AudioService, AudioGateway, AudioStreamer],
})
export class AudioModule {}
