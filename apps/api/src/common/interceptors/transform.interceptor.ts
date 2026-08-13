import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '@klyro/types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already structured with pagination or data key
        if (data && typeof data === 'object' && 'data' in data && 'pagination' in data) {
          return {
            success: true,
            data: data.data,
            pagination: data.pagination,
          };
        }

        return {
          success: true,
          data: data !== undefined ? data : null,
        };
      }),
    );
  }
}
