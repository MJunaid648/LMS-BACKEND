import { Catch, HttpException, Logger } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql/error';

@Catch()
export class GlobalExceptionFilter implements GqlExceptionFilter {
  constructor() {}
  private readonly _logger = new Logger(GlobalExceptionFilter.name);
  catch(exception: unknown) {
    this._logger.error(exception);
    let message = 'Internal server error';
    let status = 500;
    if (exception instanceof HttpException) {
      message = exception.message;
      status = exception.getStatus();
    }
    return new GraphQLError(message, {
      extensions: {
        code: status,
      },
    });
  }
}
