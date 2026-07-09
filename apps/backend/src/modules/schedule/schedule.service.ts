import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DepartmentSchedule } from './entities/department-schedule.entity';
import { AbsentShift } from './entities/absent-shift.entity';

const MONTH_NAMES = [
  'january','february','march','april','may','june',
  'july','august','september','october','november','december'
];

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(DepartmentSchedule)
    private readonly scheduleRepo: Repository<DepartmentSchedule>,
    @InjectRepository(AbsentShift)
    private readonly absentRepo: Repository<AbsentShift>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private getMonthYear(date: Date = new Date()): string {
    return `${MONTH_NAMES[date.getMonth()]}${date.getFullYear()}`;
  }

  private getCurrentSlot(date: Date = new Date()): number {
    const h = date.getHours();
    if (h < 8) return 0;
    if (h < 16) return 1;
    return 2;
  }

  /** Get full schedule grid for a dept+month, enriched with employee names */
  async getSchedule(deptId: number, year: number, month: number) {
    const rows = await this.scheduleRepo.find({
      where: { departmentId: deptId, year, month },
      order: { day: 'ASC', slot: 'ASC' },
    });

    // Collect unique employee IDs, fetch names
    const empIds = [...new Set(rows.map(r => r.employeeId).filter(Boolean))];
    const empMap: Record<number, string> = {};
    if (empIds.length > 0) {
      const empRows = await this.dataSource.query(
        `SELECT employee_id, english_first_name, english_last_name, arabic_first_name, arabic_last_name
         FROM employee WHERE employee_id = ANY($1)`,
        [empIds],
      );
      for (const e of empRows) {
        empMap[e.employee_id] = `${e.english_first_name} ${e.english_last_name}`;
      }
    }

    return rows.map(r => ({
      ...r,
      employeeName: r.employeeId ? (empMap[r.employeeId] || null) : null,
    }));
  }

  /** Auto-fill all slots for the month, cycling through dept employees */
  async autoGenerate(deptId: number, year: number, month: number) {
    const empRows = await this.dataSource.query(
      `SELECT employee_id FROM employee WHERE department_id = $1 ORDER BY employee_id`,
      [deptId],
    );
    if (empRows.length === 0) return { message: 'No employees in department' };

    const daysInMonth = new Date(year, month, 0).getDate();

    // Remove existing rows for this dept+month (keep published rows intact - overwrite all)
    await this.scheduleRepo.delete({ departmentId: deptId, year, month });

    const slots: Partial<DepartmentSchedule>[] = [];
    let idx = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      for (let slot = 0; slot < 3; slot++) {
        slots.push({
          departmentId: deptId,
          year,
          month,
          day,
          slot,
          employeeId: empRows[idx % empRows.length].employee_id,
          published: false,
        });
        idx++;
      }
    }

    await this.scheduleRepo.save(slots);
    return this.getSchedule(deptId, year, month);
  }

  /** Patch individual slot assignments */
  async updateSlots(
    deptId: number,
    updates: Array<{ id: number; employeeId: number | null }>,
  ) {
    for (const u of updates) {
      await this.scheduleRepo.update({ id: u.id, departmentId: deptId }, { employeeId: u.employeeId });
    }
    return { success: true };
  }

  /** Publish schedule — makes it visible to employees */
  async publishSchedule(deptId: number, year: number, month: number) {
    await this.scheduleRepo.update({ departmentId: deptId, year, month }, { published: true });
    return { success: true };
  }

  /** Get personal schedule for an employee (published slots only) */
  async getMySchedule(employeeId: number, year: number, month: number) {
    return this.scheduleRepo.find({
      where: { employeeId, year, month, published: true },
      order: { day: 'ASC', slot: 'ASC' },
    });
  }

  /** Who is scheduled right now in this department? */
  async getCurrentAttendance(deptId: number) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const slot = this.getCurrentSlot(now);

    const rows = await this.scheduleRepo.find({
      where: { departmentId: deptId, year, month, day, slot, published: true },
    });

    const result: any[] = [];
    for (const row of rows) {
      if (!row.employeeId) continue;
      const empRows = await this.dataSource.query(
        `SELECT employee_id, english_first_name, english_last_name, arabic_first_name, arabic_last_name
         FROM employee WHERE employee_id = $1`,
        [row.employeeId],
      );
      if (empRows[0]) {
        result.push({ scheduleId: row.id, employee: empRows[0] });
      }
    }

    const slotLabels = ['00:00 – 08:00', '08:00 – 16:00', '16:00 – 00:00'];
    return { slot, slotLabel: slotLabels[slot], day, month, year, employees: result };
  }

  /** Mark employee absent for current shift — creates/increments absent_shift record */
  async markAbsent(employeeId: number, departmentId: number) {
    const now = new Date();
    const monthYear = this.getMonthYear(now);

    const empRows = await this.dataSource.query(
      `SELECT english_first_name, english_last_name FROM employee WHERE employee_id = $1`,
      [employeeId],
    );
    const empName = empRows[0]
      ? `${empRows[0].english_first_name} ${empRows[0].english_last_name}`
      : 'Unknown';

    const existing = await this.absentRepo.findOne({
      where: { employeeId, departmentId, monthYear },
    });

    if (existing) {
      existing.absenceCount += 1;
      return this.absentRepo.save(existing);
    }

    const record = this.absentRepo.create({
      employeeId,
      employeeName: empName,
      departmentId,
      monthYear,
      absenceCount: 1,
    });
    return this.absentRepo.save(record);
  }

  /** Get absence records for a dept+month */
  async getAbsenceRecords(deptId: number, year: number, month: number) {
    const monthYear = `${MONTH_NAMES[month - 1]}${year}`;
    return this.absentRepo.find({
      where: { departmentId: deptId, monthYear },
      order: { absenceCount: 'DESC' },
    });
  }

  /** Get penalty info for an employee (current month) */
  async getMyPenalty(employeeId: number) {
    const now = new Date();
    const monthYear = this.getMonthYear(now);
    const record = await this.absentRepo.findOne({ where: { employeeId, monthYear } });
    const absenceCount = record?.absenceCount ?? 0;
    return { absenceCount, penalty: absenceCount * 5000, monthYear };
  }

  /** Sum all penalties across all employees this month (for Director) */
  async getTotalPenalties() {
    const now = new Date();
    const monthYear = this.getMonthYear(now);
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM(absence_count), 0) AS total FROM absent_shift WHERE month_year = $1`,
      [monthYear],
    );
    const totalAbsences = Number(result[0]?.total ?? 0);
    return { totalPenalty: totalAbsences * 5000, monthYear };
  }
}
