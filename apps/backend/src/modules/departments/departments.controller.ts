import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@ApiTags('Departments')
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles('ADMIN')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all hospital departments' })
  @ApiResponse({ status: 200, description: 'List of departments retrieved successfully.' })
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get('unassigned-employees')
  @ApiOperation({ summary: 'Retrieve all employees not assigned to any department' })
  async getUnassignedEmployees() {
    return this.departmentsService.getUnassignedEmployees();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a department detail' })
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Get(':id/employees')
  @ApiOperation({ summary: 'Retrieve employees assigned to this department' })
  async getDepartmentEmployees(@Param('id') id: string) {
    return this.departmentsService.getDepartmentEmployees(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new hospital department' })
  @ApiResponse({ status: 201, description: 'Department created successfully.' })
  @ApiResponse({ status: 409, description: 'Department name already exists.' })
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Post(':id/assign-employees')
  @ApiOperation({ summary: 'Assign employees to this department' })
  async assignEmployees(@Param('id') id: string, @Body() body: { employeeIds: number[] }) {
    await this.departmentsService.assignEmployees(id, body.employeeIds);
    return { success: true };
  }

  @Post(':id/remove-employees')
  @ApiOperation({ summary: 'Remove employees from this department' })
  async removeEmployees(@Param('id') id: string, @Body() body: { employeeIds: number[] }) {
    await this.departmentsService.removeEmployees(id, body.employeeIds);
    return { success: true };
  }

  @Post(':id/manager')
  @ApiOperation({ summary: 'Set or remove department manager' })
  async setManager(
    @Param('id') id: string,
    @Body() body: { employeeId: number; action: 'SET' | 'REMOVE' }
  ) {
    await this.departmentsService.setManager(id, body.employeeId, body.action);
    return { success: true };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department\'s name' })
  @ApiResponse({ status: 200, description: 'Department updated successfully.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  @ApiResponse({ status: 409, description: 'Department name already exists.' })
  async update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hospital department' })
  @ApiResponse({ status: 200, description: 'Department deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Department not found.' })
  async remove(@Param('id') id: string) {
    await this.departmentsService.remove(id);
    return { success: true, message: 'Department successfully deleted.' };
  }

  @Post(':id/request-employees')
  @Roles() // Allow any authenticated user (e.g. department managers)
  @ApiOperation({ summary: 'Request new employees for this department' })
  async requestEmployees(
    @Param('id') id: string,
    @Body() body: { wantedCount: number; reason?: string }
  ) {
    return this.departmentsService.requestEmployees(id, body.wantedCount, body.reason);
  }

  @Post(':id/clear-request')
  @ApiOperation({ summary: 'Clear/done employee request for this department' })
  async clearRequest(@Param('id') id: string) {
    return this.departmentsService.clearRequest(id);
  }
}
