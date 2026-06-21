import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { User } from '../user/user.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthResponse } from './dto/auth-response';
import { RegisterInput } from './dto/register.input';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';

@Resolver()
export class AuthResolver {
  constructor(private readonly _authService: AuthService) {}

  @Query(() => User)
  me(@CurrentUser() user: User) {
    return user;
  }

  @Public()
  @Mutation(() => AuthResponse)
  register(@Args('input') input: RegisterInput) {
    return this._authService.register(input);
  }

  @Public()
  @Mutation(() => AuthResponse)
  login(@Args('input') input: LoginInput) {
    return this._authService.login(input);
  }

  @Mutation(() => Boolean)
  logout(@CurrentUser() user: User) {
    return this._authService.logout(user);
  }

  @Public()
  @Mutation(() => AuthResponse)
  refresh(@Args('token') token: string) {
    return this._authService.refresh(token);
  }
}
