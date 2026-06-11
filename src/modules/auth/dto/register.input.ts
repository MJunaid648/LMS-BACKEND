import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsNotEmpty()
  name!: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(10)
  password!: string;
}
