import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceController } from './device.controller';
import { OtaController } from './ota.controller';

@Module({
  controllers: [DeviceController, OtaController],
  providers: [DeviceService],
})
export class DeviceModule {}
