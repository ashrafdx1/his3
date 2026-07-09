import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async findAll() {
    const list = await this.departmentRepository.find({
      order: {
        departmentId: 'ASC',
      },
    });
    const result = [];
    for (const dept of list) {
      // Get count
      const countRes = await this.departmentRepository.query(
        'SELECT COUNT(*) as count FROM employee WHERE department_id = $1',
        [dept.departmentId]
      );
      const employeeCount = Number(countRes[0]?.count || 0);

      // Get manager name
      let managerName = null;
      if (dept.departmentMgrId && dept.departmentMgrId > 0) {
        const mgrRes = await this.departmentRepository.query(
          'SELECT english_first_name, english_last_name FROM employee WHERE employee_id = $1',
          [dept.departmentMgrId]
        );
        if (mgrRes[0]) {
          managerName = `${mgrRes[0].english_first_name} ${mgrRes[0].english_last_name}`;
        }
      }

      result.push({
        id: String(dept.departmentId),
        departmentId: dept.departmentId,
        name: dept.name,
        description: dept.description,
        managerName,
        employeeCount,
        created_at: dept.created_at,
        last_edited: dept.lastEdited,
        department_management: dept.departmentManagement,
        'department-mgr-id': dept.departmentMgrId,
        'dept-arabic-name': dept.arabicName,
        'dept-arabic-description': dept.arabicDescription,
        requestedCount: dept.requestedCount,
        requestedReason: dept.requestedReason,
      });
    }
    return result;
  }

  async findOne(id: string) {
    const deptId = parseInt(id, 10);
    if (isNaN(deptId)) {
      throw new NotFoundException(`Invalid department ID '${id}'.`);
    }

    const department = await this.departmentRepository.findOne({
      where: { departmentId: deptId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID '${id}' not found.`);
    }

    // Get count
    const countRes = await this.departmentRepository.query(
      'SELECT COUNT(*) as count FROM employee WHERE department_id = $1',
      [department.departmentId]
    );
    const employeeCount = Number(countRes[0]?.count || 0);

    // Get manager name
    let managerName = null;
    if (department.departmentMgrId && department.departmentMgrId > 0) {
      const mgrRes = await this.departmentRepository.query(
        'SELECT english_first_name, english_last_name FROM employee WHERE employee_id = $1',
        [department.departmentMgrId]
      );
      if (mgrRes[0]) {
        managerName = `${mgrRes[0].english_first_name} ${mgrRes[0].english_last_name}`;
      }
    }

    return {
      id: String(department.departmentId),
      departmentId: department.departmentId,
      name: department.name,
      description: department.description,
      managerName,
      employeeCount,
      created_at: department.created_at,
      last_edited: department.lastEdited,
      department_management: department.departmentManagement,
      'department-mgr-id': department.departmentMgrId,
      'dept-arabic-name': department.arabicName,
      'dept-arabic-description': department.arabicDescription,
      requestedCount: department.requestedCount,
      requestedReason: department.requestedReason,
    };
  }

  async create(createDepartmentDto: CreateDepartmentDto) {
    const existing = await this.departmentRepository.findOne({
      where: { name: createDepartmentDto.name },
    });
    if (existing) {
      throw new ConflictException(`Department with name '${createDepartmentDto.name}' already exists.`);
    }

    // Validation: If Arabic Name or Arabic Description is provided, both must be filled.
    const hasArabicName = !!createDepartmentDto.arabicName?.trim();
    const hasArabicDesc = !!createDepartmentDto.arabicDescription?.trim();
    if (hasArabicName !== hasArabicDesc) {
      throw new BadRequestException(
        'If either Arabic Name or Arabic Description is provided, both must be filled.'
      );
    }

    // Determine the next departmentId: max + 1, or 1 if empty
    const lastDept = await this.departmentRepository.find({
      order: { departmentId: 'DESC' },
      take: 1,
    });
    const nextId = lastDept.length > 0 ? lastDept[0].departmentId + 1 : 1;

    const department = this.departmentRepository.create({
      departmentId: nextId,
      name: createDepartmentDto.name,
      description: createDepartmentDto.description,
      arabicName: createDepartmentDto.arabicName || null,
      arabicDescription: createDepartmentDto.arabicDescription || null,
      departmentManagement: 'no',
      departmentMgrId: 0,
      lastEdited: null,
    });

    const saved = await this.departmentRepository.save(department);
    return {
      id: String(saved.departmentId),
      departmentId: saved.departmentId,
      name: saved.name,
      description: saved.description,
      managerName: null,
      employeeCount: 0,
      created_at: saved.created_at,
      last_edited: saved.lastEdited,
      department_management: saved.departmentManagement,
      'department-mgr-id': saved.departmentMgrId,
      'dept-arabic-name': saved.arabicName,
      'dept-arabic-description': saved.arabicDescription,
    };
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const deptId = parseInt(id, 10);
    if (isNaN(deptId)) {
      throw new NotFoundException(`Invalid department ID '${id}'.`);
    }

    const department = await this.departmentRepository.findOne({
      where: { departmentId: deptId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID '${id}' not found.`);
    }

    if (updateDepartmentDto.name !== department.name) {
      const existing = await this.departmentRepository.findOne({
        where: { name: updateDepartmentDto.name },
      });
      if (existing) {
        throw new ConflictException(`Department with name '${updateDepartmentDto.name}' already exists.`);
      }
    }

    // Validation: If either Arabic Name or Arabic Description is provided, both must be filled.
    const hasArabicName = !!updateDepartmentDto.arabicName?.trim();
    const hasArabicDesc = !!updateDepartmentDto.arabicDescription?.trim();
    if (hasArabicName !== hasArabicDesc) {
      throw new BadRequestException(
        'If either Arabic Name or Arabic Description is provided, both must be filled.'
      );
    }

    department.name = updateDepartmentDto.name;
    department.description = updateDepartmentDto.description !== undefined ? (updateDepartmentDto.description || null) : department.description;
    department.arabicName = updateDepartmentDto.arabicName !== undefined ? (updateDepartmentDto.arabicName || null) : department.arabicName;
    department.arabicDescription = updateDepartmentDto.arabicDescription !== undefined ? (updateDepartmentDto.arabicDescription || null) : department.arabicDescription;
    department.lastEdited = new Date();

    const saved = await this.departmentRepository.save(department);

    // Get count
    const countRes = await this.departmentRepository.query(
      'SELECT COUNT(*) as count FROM employee WHERE department_id = $1',
      [saved.departmentId]
    );
    const employeeCount = Number(countRes[0]?.count || 0);

    // Get manager name
    let managerName = null;
    if (saved.departmentMgrId && saved.departmentMgrId > 0) {
      const mgrRes = await this.departmentRepository.query(
        'SELECT english_first_name, english_last_name FROM employee WHERE employee_id = $1',
        [saved.departmentMgrId]
      );
      if (mgrRes[0]) {
        managerName = `${mgrRes[0].english_first_name} ${mgrRes[0].english_last_name}`;
      }
    }

    return {
      id: String(saved.departmentId),
      departmentId: saved.departmentId,
      name: saved.name,
      description: saved.description,
      managerName,
      employeeCount,
      created_at: saved.created_at,
      last_edited: saved.lastEdited,
      department_management: saved.departmentManagement,
      'department-mgr-id': saved.departmentMgrId,
      'dept-arabic-name': saved.arabicName,
      'dept-arabic-description': saved.arabicDescription,
    };
  }

  async remove(id: string): Promise<void> {
    const deptId = parseInt(id, 10);
    if (isNaN(deptId)) {
      throw new NotFoundException(`Invalid department ID '${id}'.`);
    }

    const department = await this.departmentRepository.findOne({
      where: { departmentId: deptId },
    });
    if (!department) {
      throw new NotFoundException(`Department with ID '${id}' not found.`);
    }

    // Set department_id to NULL for all employees previously in this department
    await this.departmentRepository.query(
      'UPDATE employee SET department_id = NULL, title = NULL, updated_at = CURRENT_TIMESTAMP WHERE department_id = $1',
      [deptId]
    );

    await this.departmentRepository.remove(department);
  }

  async getUnassignedEmployees() {
    return this.departmentRepository.query(
      'SELECT * FROM employee WHERE department_id IS NULL ORDER BY employee_id'
    );
  }

  async getDepartmentEmployees(deptIdStr: string) {
    const deptId = parseInt(deptIdStr, 10);
    return this.departmentRepository.query(
      'SELECT * FROM employee WHERE department_id = $1 ORDER BY employee_id',
      [deptId]
    );
  }

  async assignEmployees(deptIdStr: string, employeeIds: number[]) {
    const deptId = parseInt(deptIdStr, 10);
    if (employeeIds.length === 0) return;
    await this.departmentRepository.query(
      'UPDATE employee SET department_id = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ANY($2)',
      [deptId, employeeIds]
    );
  }

  async removeEmployees(deptIdStr: string, employeeIds: number[]) {
    const deptId = parseInt(deptIdStr, 10);
    if (employeeIds.length === 0) return;

    // 1. If any of these employees is the manager, clear management columns in department table
    const dept = await this.departmentRepository.findOne({
      where: { departmentId: deptId }
    });
    if (dept && employeeIds.includes(Number(dept.departmentMgrId))) {
      dept.departmentManagement = 'no';
      dept.departmentMgrId = 0;
      await this.departmentRepository.save(dept);
    }

    // 2. Set department_id and title to null for manager employees being removed
    await this.departmentRepository.query(
      'UPDATE employee SET department_id = NULL, title = NULL, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ANY($1)',
      [employeeIds]
    );
  }

  async setManager(deptIdStr: string, employeeId: number, action: 'SET' | 'REMOVE') {
    const deptId = parseInt(deptIdStr, 10);
    const dept = await this.departmentRepository.findOne({
      where: { departmentId: deptId }
    });
    if (!dept) {
      throw new NotFoundException(`Department ${deptId} not found.`);
    }

    if (action === 'SET') {
      // Unset previous manager title
      if (dept.departmentMgrId && dept.departmentMgrId > 0) {
        await this.departmentRepository.query(
          "UPDATE employee SET title = NULL, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $1",
          [dept.departmentMgrId]
        );
      }
      // Set new manager title
      await this.departmentRepository.query(
        "UPDATE employee SET title = 'Manager', updated_at = CURRENT_TIMESTAMP WHERE employee_id = $1",
        [employeeId]
      );
      // Update department table
      dept.departmentManagement = 'yes';
      dept.departmentMgrId = employeeId;
      await this.departmentRepository.save(dept);
    } else {
      // action === 'REMOVE'
      await this.departmentRepository.query(
        "UPDATE employee SET title = NULL, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $1",
        [employeeId]
      );
      dept.departmentManagement = 'no';
      dept.departmentMgrId = 0;
      await this.departmentRepository.save(dept);
    }
  }

  async requestEmployees(deptIdStr: string, wantedCount: number, reason?: string) {
    const deptId = parseInt(deptIdStr, 10);
    const dept = await this.departmentRepository.findOne({
      where: { departmentId: deptId }
    });
    if (!dept) {
      throw new NotFoundException(`Department ${deptId} not found.`);
    }
    dept.requestedCount = wantedCount;
    dept.requestedReason = reason || null;
    await this.departmentRepository.save(dept);
    return dept;
  }

  async clearRequest(deptIdStr: string) {
    const deptId = parseInt(deptIdStr, 10);
    const dept = await this.departmentRepository.findOne({
      where: { departmentId: deptId }
    });
    if (!dept) {
      throw new NotFoundException(`Department ${deptId} not found.`);
    }
    dept.requestedCount = null;
    dept.requestedReason = null;
    await this.departmentRepository.save(dept);
    return dept;
  }
}
