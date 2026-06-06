import { Module } from '@nestjs/common';
import { ProfilesService } from './profile.service';

@Module({
  providers: [ProfilesService],
})
export class ProfilesModule {}
