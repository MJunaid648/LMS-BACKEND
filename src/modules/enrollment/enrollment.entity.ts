import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Course } from '../course/course.entity';

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
@ObjectType()
@Entity('enrollments')
@Unique(['user', 'course'])
export class Enrollment {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user) => user.enrollments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  user?: User;

  @Field(() => Course, { nullable: true })
  @ManyToOne(() => Course, (course) => course.enrollments, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  course?: Course;

  @Field()
  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status!: EnrollmentStatus;

  @Field(() => Int)
  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Field()
  @CreateDateColumn()
  enrolledAt!: Date;
}
