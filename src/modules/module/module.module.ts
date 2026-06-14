import { TypeOrmModule } from '@nestjs/typeorm';
import { Module as ModuleEntity } from './module.entity';
import { Module } from '@nestjs/common';
@Module({
  imports: [TypeOrmModule.forFeature([ModuleEntity])],
})
export class ModulesModule {}
