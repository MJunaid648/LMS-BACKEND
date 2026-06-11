import { Query, Resolver } from '@nestjs/graphql';
import { User } from './user.entity';
import { UsersService } from './user.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private _userService: UsersService) {}

  @Query(() => [User])
  users() {
    return this._userService.findAll();
  }
}
