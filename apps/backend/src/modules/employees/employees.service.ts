import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Employee } from '../auth/entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(createEmployeeDto: CreateEmployeeDto): Promise<Omit<Employee, 'password_hash'>> {
    // 1. Check if email already exists
    const existing = await this.employeeRepository.findOne({
      where: { email: createEmployeeDto.email }
    });
    if (existing) {
      throw new ConflictException('An employee with this email already exists.');
    }

    // 2. Determine next employee_id manually by checking max ID
    const lastEmployees = await this.employeeRepository.find({
      order: { employee_id: 'DESC' },
      take: 1,
    });
    const nextId = lastEmployees.length > 0 ? lastEmployees[0].employee_id + 1 : 1;

    // 3. Format username and password
    const username = `user${nextId}`;
    const plainPassword = `password${nextId}`;
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    // 4. Create and save employee
    const newEmployee = this.employeeRepository.create({
      ...createEmployeeDto,
      employee_id: nextId,
      username,
      password_hash: passwordHash,
      title: null,
      department_id: null,
      date_of_birth: new Date(createEmployeeDto.date_of_birth),
    });

    const saved = await this.employeeRepository.save(newEmployee);

    // Update budget summary
    const salary = Number(saved.salary || 0);
    await this.dataSource.query(`
      UPDATE budget 
      SET budget_amount = budget_amount - $1, 
          budget_counter = budget_counter + 1, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE budget_id = 1
    `, [salary]);

    const { password_hash, ...result } = saved;
    return result;
  }

  async findAll(): Promise<Omit<Employee, 'password_hash'>[]> {
    const list = await this.employeeRepository.find({
      order: { employee_id: 'ASC' }
    });
    return list.map(({ password_hash, ...rest }) => rest);
  }

  async findOne(id: number): Promise<Omit<Employee, 'password_hash'>> {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: id }
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found.`);
    }
    const { password_hash, ...result } = employee;
    return result;
  }

  async update(id: number, updateEmployeeDto: UpdateEmployeeDto): Promise<Omit<Employee, 'password_hash'>> {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: id }
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found.`);
    }

    // If email is changing, make sure it is not in use
    if (updateEmployeeDto.email && updateEmployeeDto.email !== employee.email) {
      const emailConflict = await this.employeeRepository.findOne({
        where: { email: updateEmployeeDto.email }
      });
      if (emailConflict) {
        throw new ConflictException('An employee with this email already exists.');
      }
    }

    const oldSalary = Number(employee.salary || 0);

    // Map fields manually to prevent editing read-only values (like employee_id, username, password_hash)
    if (updateEmployeeDto.arabic_first_name !== undefined) employee.arabic_first_name = updateEmployeeDto.arabic_first_name;
    if (updateEmployeeDto.arabic_middle_name !== undefined) employee.arabic_middle_name = updateEmployeeDto.arabic_middle_name;
    if (updateEmployeeDto.arabic_last_name !== undefined) employee.arabic_last_name = updateEmployeeDto.arabic_last_name;
    if (updateEmployeeDto.english_first_name !== undefined) employee.english_first_name = updateEmployeeDto.english_first_name;
    if (updateEmployeeDto.english_middle_name !== undefined) employee.english_middle_name = updateEmployeeDto.english_middle_name;
    if (updateEmployeeDto.english_last_name !== undefined) employee.english_last_name = updateEmployeeDto.english_last_name;
    if (updateEmployeeDto.gender !== undefined) employee.gender = updateEmployeeDto.gender;
    if (updateEmployeeDto.date_of_birth !== undefined) employee.date_of_birth = new Date(updateEmployeeDto.date_of_birth);
    if (updateEmployeeDto.employment_type !== undefined) employee.employment_type = updateEmployeeDto.employment_type;
    if (updateEmployeeDto.phone_number !== undefined) employee.phone_number = updateEmployeeDto.phone_number;
    if (updateEmployeeDto.email !== undefined) employee.email = updateEmployeeDto.email;
    if (updateEmployeeDto.salary !== undefined) employee.salary = updateEmployeeDto.salary;
    if (updateEmployeeDto.employee_picture_url !== undefined) employee.employee_picture_url = updateEmployeeDto.employee_picture_url;

    const saved = await this.employeeRepository.save(employee);

    // Update budget if salary changed
    const newSalary = Number(saved.salary || 0);
    const salaryDiff = newSalary - oldSalary;
    if (salaryDiff !== 0) {
      await this.dataSource.query(`
        UPDATE budget 
        SET budget_amount = budget_amount - $1, 
            updated_at = CURRENT_TIMESTAMP 
        WHERE budget_id = 1
      `, [salaryDiff]);
    }

    const { password_hash, ...result } = saved;
    return result;
  }

  async remove(id: number): Promise<void> {
    const employee = await this.employeeRepository.findOne({
      where: { employee_id: id }
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found.`);
    }
    const salary = Number(employee.salary || 0);
    await this.employeeRepository.remove(employee);

    // Update budget
    await this.dataSource.query(`
      UPDATE budget 
      SET budget_amount = budget_amount + $1, 
          budget_counter = budget_counter - 1, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE budget_id = 1
    `, [salary]);
  }
}
