import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      return;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    let message = exception.message;
    if (typeof exceptionResponse === 'object' && exceptionResponse['message']) {
       message = exceptionResponse['message'];
    }

    if (Array.isArray(message)) {
      message = message.join(', ');
    }

    if (status === 404 || status === 405) {
      const { method, url, headers, body } = ctx.getRequest<Request>();
      console.warn(`[HTTP TRAP] Unknown request: ${method} ${url}`);
      console.warn(`- Headers: ${JSON.stringify(headers)}`);
      if (Object.keys(body).length > 0) {
        console.warn(`- Body: ${JSON.stringify(body)}`);
      }
    }

    response
      .status(status)
      .json({
        status: 'error',
        message: message,
        data: null,
      });
  }
}
