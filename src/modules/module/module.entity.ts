import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Course } from '../course/course.entity';
import { Lesson } from '../lesson/lesson.entity';

@ObjectType()
@Entity('modules')
export class Module {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column({ type: 'varchar' })
  title!: string;

  @ManyToOne(() => Course, (course) => course.modules, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  course!: Course;

  @Field()
  @Column({ name: 'order_number', type: 'int', default: 1 })
  orderNumber!: number;

  @OneToMany(() => Lesson, (lesson) => lesson.module)
  lessons!: Lesson[];
}
