import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

/**
 * All endpoints are JWT-guarded but role-agnostic (any authenticated user).
 * Specific manager checks are enforced in the frontend; server validates JWT only.
 * Routes with literal prefixes (my, absent, penalty) MUST be declared before
 * parameterized routes to avoid NestJS route conflicts.
 */
@ApiTags('Schedule')
@Controller('schedule')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // ── fixed-prefix routes first ────────────────────────────────────────────

  @Get('penalty/total')
  @ApiOperation({ summary: 'Total absence penalties for current month (Director)' })
  async getTotalPenalties() {
    return this.scheduleService.getTotalPenalties();
  }

  @Get('penalty/my/:employeeId')
  @ApiOperation({ summary: 'Personal absence penalty for current month' })
  async getMyPenalty(@Param('employeeId') employeeId: string) {
    return this.scheduleService.getMyPenalty(Number(employeeId));
  }

  @Get('my/:employeeId/:year/:month')
  @ApiOperation({ summary: 'Personal published schedule for a month' })
  async getMySchedule(
    @Param('employeeId') employeeId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.scheduleService.getMySchedule(Number(employeeId), Number(year), Number(month));
  }

  @Post('absent')
  @ApiOperation({ summary: 'Mark an employee absent for the current shift' })
  async markAbsent(@Body() body: { employeeId: number; departmentId: number }) {
    return this.scheduleService.markAbsent(body.employeeId, body.departmentId);
  }

  @Get('absent/:deptId/:year/:month')
  @ApiOperation({ summary: 'Absence records for a dept+month' })
  async getAbsences(
    @Param('deptId') deptId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.scheduleService.getAbsenceRecords(Number(deptId), Number(year), Number(month));
  }

  // ── parameterized routes ─────────────────────────────────────────────────

  @Get(':deptId/attendance/now')
  @ApiOperation({ summary: 'Who is scheduled right now in a department?' })
  async getAttendance(@Param('deptId') deptId: string) {
    return this.scheduleService.getCurrentAttendance(Number(deptId));
  }

  @Get(':deptId/:year/:month')
  @ApiOperation({ summary: 'Full schedule grid for a dept+month' })
  async getSchedule(
    @Param('deptId') deptId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.scheduleService.getSchedule(Number(deptId), Number(year), Number(month));
  }

  @Post(':deptId/:year/:month/auto')
  @ApiOperation({ summary: 'Auto-generate schedule for a dept+month' })
  async autoGenerate(
    @Param('deptId') deptId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.scheduleService.autoGenerate(Number(deptId), Number(year), Number(month));
  }

  @Post(':deptId/:year/:month/publish')
  @ApiOperation({ summary: 'Publish a schedule — visible to employees' })
  async publish(
    @Param('deptId') deptId: string,
    @Param('year') year: string,
    @Param('month') month: string,
  ) {
    return this.scheduleService.publishSchedule(Number(deptId), Number(year), Number(month));
  }

  @Patch(':deptId/slots')
  @ApiOperation({ summary: 'Manually update individual slot assignments' })
  async updateSlots(
    @Param('deptId') deptId: string,
    @Body() body: { updates: Array<{ id: number; employeeId: number | null }> },
  ) {
    return this.scheduleService.updateSlots(Number(deptId), body.updates);
  }
}
