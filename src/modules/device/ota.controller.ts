import { Controller, Get, Post, Req, HttpCode } from '@nestjs/common';
import type { Request } from 'express';

@Controller('ota')
export class OtaController {

  // ESP32 will call GET or POST /ota/ to check for firmware updates or config
  @Get()
  getOtaConfig(@Req() request: Request) {
    return this.generateOtaResponse(request, 'GET');
  }

  @Post()
  @HttpCode(200)
  postOtaConfig(@Req() request: Request) {
    return this.generateOtaResponse(request, 'POST');
  }

  @Post('activate')
  @HttpCode(200)
  activateDevice(@Req() request: Request) {
    console.log(`[OTA] Activation request received from ${request.headers['device-id'] || 'unknown'}`);
    return { status: "ok" };
  }

  private generateOtaResponse(request: Request, method: string) {
    const host = request.get('host') || 'localhost:3000';
    const deviceId = request.headers['device-id'];

    console.log(`[OTA] ${method} request. Host: ${host}, Device-Id: ${deviceId}`);
    console.log(`[OTA] Request Body: ${JSON.stringify(request.body)}`);

    // If it's a browser checking the server (No ESP32 Device-Id Header)
    if (!deviceId) {
      console.log('[OTA] Browser health check requested.');
      return {
        status: "ok",
        message: "Server is working normally",
        timestamp: new Date().toISOString(),
        timezone_offset: -new Date().getTimezoneOffset()
      };
    }

    // It is an ESP32 Device
    const wsUrl = `ws://${host}/xiaozhi/v1`;
    console.log(`[OTA] Device connected: ${deviceId}. Serving WS URL: ${wsUrl}`);

    const response = {
      websocket: {
        url: wsUrl,
        version: 3,
        token: "test-token"
      },
      firmware: {
        version: "2.2.4", // matching real server example
        url: ""
      },
      server_time: {
        timestamp: Date.now(),
        timezone_offset: 420 // matching real server example (GMT+7)
      }
    };

    console.log(`[OTA] Sending response to ${deviceId}: ${JSON.stringify(response)}`);
    return response;
  }
}
