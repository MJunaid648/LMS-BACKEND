import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { randomUUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { Observable, tap } from 'rxjs';
import { User } from 'src/modules/user/user.entity';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly _logger = new Logger(LoggingInterceptor.name);
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const start = Date.now();

    const gqlCtx = GqlExecutionContext.create(context);
    const info: GraphQLResolveInfo = gqlCtx.getInfo();
    const { req } = gqlCtx.getContext<{ req: Request & { user: User } }>();
    const requestId = randomUUID();

    return next.handle().pipe(
      tap(() => {
        this._logger.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            method: info.path.typename,
            path: '/graphql',
            operation: info.operation.name?.value,
            duration: `${Date.now() - start}ms`,
            userId: req.user?.id ?? 'unauthenticated',
            requestId,
          }),
        );
      }),
    );
  }
}
