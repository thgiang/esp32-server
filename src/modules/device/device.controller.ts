import { Controller, Post, Body } from '@nestjs/common';
import { DeviceService } from './device.service';

@Controller('device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('telemetry')
  receiveTelemetry(@Body() payload: any) {
    return {
      received: payload,
      message: 'Xin chào đây là module giao tiếp thiết bị, tôi làm placeholder nhận JSON từ ESP32',
      config: {
        sleepInterval: 60000,
        volume: 80,
      }
    };
  }
}
