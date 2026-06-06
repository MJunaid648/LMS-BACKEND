import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@ObjectType()
@Entity('profiles')
export class Profile {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => User)
  @OneToOne(() => User, (user) => user.profile, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Field(() => String)
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  bio?: string;

  @Field(() => String)
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  avatarUrl?: string;
}
