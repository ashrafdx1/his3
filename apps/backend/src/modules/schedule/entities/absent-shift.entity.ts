import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/** Tracks missed shifts per employee per month. One row per employee per month_year. */
@Entity('absent_shift')
export class AbsentShift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id', type: 'integer' })
  employeeId: number;

  @Column({ name: 'employee_name', type: 'varchar', length: 255 })
  employeeName: string;

  @Column({ name: 'department_id', type: 'integer' })
  departmentId: number;

  /** e.g. "july2026" */
  @Column({ name: 'month_year', type: 'varchar', length: 20 })
  monthYear: string;

  /** Number of shifts missed this month — each adds 5000 penalty */
  @Column({ name: 'absence_count', type: 'integer', default: 1 })
  absenceCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
