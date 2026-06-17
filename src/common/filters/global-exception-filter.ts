import { Catch, HttpException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql/error';

@Catch()
export class GlobalExceptionFilter implements GqlExceptionFilter {
  constructor() {}
  catch(exception: unknown) {
    console.log('exception: ', exception);
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
