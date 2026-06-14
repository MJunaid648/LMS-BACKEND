import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './lesson.entity';

@Module({ imports: [TypeOrmModule.forFeature([Lesson])] })
export class LessonModule {}
