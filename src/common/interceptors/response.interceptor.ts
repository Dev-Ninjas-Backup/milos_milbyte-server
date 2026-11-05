import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

type CommonResponse<T> = {
  success: boolean;
  message: string;
  route: string;
  timestamp: string;
  data: T;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  CommonResponse<unknown>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<CommonResponse<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const route = request.originalUrl || request.url;

    return next.handle().pipe(
      map((payload: unknown) => {
        const timestamp = new Date().toISOString();

        if (this.isAlreadyCommonResponse(payload)) {
          return {
            ...payload,
            route,
            timestamp,
          };
        }

        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const obj = payload as Record<string, unknown>;
          const message =
            typeof obj.message === 'string'
              ? obj.message
              : 'Request successful';

          const { message: _message, ...rest } = obj;

          return {
            success: true,
            message,
            route,
            timestamp,
            data: Object.keys(rest).length > 0 ? rest : null,
          };
        }

        return {
          success: true,
          message: 'Request successful',
          route,
          timestamp,
          data: payload ?? null,
        };
      }),
    );
  }

  private isAlreadyCommonResponse(
    payload: unknown,
  ): payload is CommonResponse<unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }

    const obj = payload as Record<string, unknown>;

    return (
      typeof obj.success === 'boolean' &&
      typeof obj.message === 'string' &&
      'data' in obj
    );
  }
}
