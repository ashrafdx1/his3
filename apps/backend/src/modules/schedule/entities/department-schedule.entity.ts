import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('department_schedule')
export class DepartmentSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'department_id', type: 'integer' })
  departmentId: number;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'integer' })
  month: number;

  @Column({ type: 'integer' })
  day: number;

  /** 0 = 00:00–08:00 · 1 = 08:00–16:00 · 2 = 16:00–00:00 */
  @Column({ type: 'integer' })
  slot: number;

  @Column({ name: 'employee_id', type: 'integer', nullable: true })
  employeeId: number | null;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
