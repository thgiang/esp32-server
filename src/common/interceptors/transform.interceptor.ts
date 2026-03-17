import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface Response<T> {
  data: T;
  status: string;
  message: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      map(data => {
        const url = request.url || '';
        const path = request.path || '';
        const isOta = url.includes('/ota') || path.includes('/ota');
        const isWs = request.headers['upgrade'] === 'websocket';

        if (isOta || isWs) {
          console.log(`[Interceptor] Bypassing wrapping for ${isWs ? 'WS' : 'OTA'}: ${url}`);
          return data;
        }

        return {
          status: 'success',
          message: '',
          data,
        };
      }),
    );
  }
}
