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
  constructor(private readonly authService: AuthService) {}

  @Query(() => User)
  me(@CurrentUser() user: User) {
    return user;
  }

  @Public()
  @Mutation(() => AuthResponse)
  register(@Args('input') input: RegisterInput) {
    return this.authService.register(input);
  }

  @Public()
  @Mutation(() => AuthResponse)
  login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }
}
