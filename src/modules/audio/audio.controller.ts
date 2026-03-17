import { Controller, Get, Param } from '@nestjs/common';
import { AudioService } from './audio.service';

@Controller('audio')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Get('play/:id')
  playAudio(@Param('id') id: string) {
    return {
      id,
      message: 'Xin chào đây là module phát nhạc, tôi ở đây chỉ làm placeholder, bạn hãy đưa logic stream mp3/wav vào đây nhé',
    };
  }
}
