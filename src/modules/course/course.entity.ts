import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Module } from '../module/module.entity';
import { Enrollment } from '../enrollment/enrollment.entity';

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(CourseStatus, { name: 'CourseStatus' });

@ObjectType()
@Entity('courses')
export class Course {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column({ type: 'varchar' })
  title!: string;

  @Field(() => String)
  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.courses, {
    onDelete: 'RESTRICT',
    nullable: false,
  })
  instructor!: User;

  @Field(() => String)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price!: number;

  @Index()
  @Field(() => CourseStatus)
  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  status!: CourseStatus;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Module, (module) => module.course)
  modules!: Module[];

  @OneToMany(() => Enrollment, (enrollment) => enrollment.course)
  enrollments!: Enrollment[];
}
