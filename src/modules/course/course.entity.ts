import { Field, Int, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Module } from '../module/module.entity';

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
  @Column({ type: 'decimal', default: 0 })
  price!: number;

  @Field()
  @Column({ type: 'bool', name: 'is_published', default: false })
  isPublished!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @OneToMany(() => Module, (module) => module.course)
  modules!: Module[];
}
