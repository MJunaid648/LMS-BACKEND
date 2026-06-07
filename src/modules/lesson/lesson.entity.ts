import { Field, Int, ObjectType } from '@nestjs/graphql';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Module } from '../module/module.entity';

@ObjectType()
@Entity('lessons')
export class Lesson {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  @Column({ type: 'varchar' })
  title!: string;

  @ManyToOne(() => Module, (module) => module.lessons, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  module!: Module;

  @Field()
  @Column({ type: 'int', default: 1 })
  orderNumber!: number;

  @Field(() => String)
  @Column({
    type: 'varchar',
    nullable: true,
    default: null,
  })
  contentUrl?: string;

  @Field(() => String)
  @Column({
    type: 'bigint',
    nullable: true,
  })
  durationSeconds?: number;
}
