import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../rbac/entities/role.entity';
import { Permission } from '../../rbac/entities/permission.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Checking database status to perform seeding checks...');
    try {
      // 1. Create default Admin permissions
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

      // 2. Create Administrator Role
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

    } catch (error) {
      this.logger.error('Failed to execute automatic database seeding:', error);
    }
  }
}
