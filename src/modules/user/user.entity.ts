import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Profile } from '../profile/profile.entity';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}

@ObjectType()
@Entity('users')
export class User {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Field(() => String)
  @Column({ type: 'varchar', unique: true, length: 100 })
  email!: string;

  @Column({ type: 'varchar', length: 150 })
  passwordHash!: string;

  @Field(() => UserRole)
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile!: Profile;

  @OneToMany(() => Course, (course) => course.instructor)
  courses!: Course[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.user)
  enrollments!: Enrollment[];
}
