import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
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
registerEnumType(EnrollmentStatus, { name: 'EnrollmentStatus' });

@ObjectType()
@Entity('enrollments')
@Unique(['user', 'course'])
export class Enrollment {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.enrollments, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  user!: User;

  @Field(() => Course)
  @ManyToOne(() => Course, (course) => course.enrollments, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  course!: Course;

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

  @DeleteDateColumn()
  deletedAt?: Date;
}
