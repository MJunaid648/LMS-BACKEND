import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User, UserRole } from 'src/modules/user/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private _reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const gqlContext = GqlExecutionContext.create(context);
    const roles = this._reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles) return true;
    const { req } = gqlContext.getContext<{ req: Request & { user: User } }>();
    const userRole = req.user.role;
    return roles.includes(userRole);
  }
}
