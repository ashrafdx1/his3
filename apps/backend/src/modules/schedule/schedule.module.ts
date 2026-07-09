import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { DepartmentSchedule } from './entities/department-schedule.entity';
import { AbsentShift } from './entities/absent-shift.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentSchedule, AbsentShift])],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
