import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioModule } from './modules/audio/audio.module';
import { DeviceModule } from './modules/device/device.module';

@Module({
  imports: [AudioModule, DeviceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
