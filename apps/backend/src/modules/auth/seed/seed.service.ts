import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { Role } from '../../rbac/entities/role.entity';
import { Permission } from '../../rbac/entities/permission.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking database status to perform seeding checks...');
    try {
      // 1. Clear any existing admin accounts to ensure ONLY Admin1 exists
      await this.adminRepository.query('DELETE FROM admin;');
      this.logger.log('Cleared existing admin accounts to ensure fresh seeding.');

      // 2. Create default Admin permissions
      const permissionCodes = ['*', 'user:read', 'user:write', 'rbac:manage', 'audit:read'];
      const permissions: Permission[] = [];

      for (const code of permissionCodes) {
        let perm = await this.permissionRepository.findOne({ where: { code } });
        if (!perm) {
          perm = this.permissionRepository.create({
            code,
            description: `Seeded system clearance for code: ${code}`,
          });
          perm = await this.permissionRepository.save(perm);
          this.logger.log(`Created Permission clearance: ${code}`);
        }
        permissions.push(perm);
      }

      // 3. Create Administrator Role
      const roleName = 'ADMINISTRATOR';
      let adminRole = await this.roleRepository.findOne({
        where: { name: roleName },
        relations: ['permissions'],
      });

      if (!adminRole) {
        adminRole = this.roleRepository.create({
          name: roleName,
          description: 'Administrator role possessing all permission controls.',
          permissions: [],
        });
      }

      // Associate all permissions to Administrator role
      adminRole.permissions = permissions;
      adminRole = await this.roleRepository.save(adminRole);
      this.logger.log(`Seeded Role: ${roleName} with wildcard and core permissions.`);

      // 4. Create Admin1 user in Admin table
      const plainPassword = 'AdminPass1';
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

      const newAdmin = this.adminRepository.create({
        username: 'Admin1',
        password_hash: hashedPassword,
        roles: [adminRole],
        salary: 150000.00,
        login_count: 0,
        password_change_count: 0,
      });

      await this.adminRepository.save(newAdmin);
      this.logger.log('====================================================');
      this.logger.log('🚀 Automated Database Seeding Completed Successfully!');
      this.logger.log('👤 Admin Username: Admin1');
      this.logger.log('🔑 Password: AdminPass1');
      this.logger.log('====================================================');

    } catch (error) {
      this.logger.error('Failed to execute automatic database seeding:', error);
    }
  }
}
