import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Employee } from './entities/employee.entity';
import { Admin } from './entities/admin.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginAttempt } from './entities/login-attempt.entity';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(LoginAttempt)
    private readonly loginAttemptRepository: Repository<LoginAttempt>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string): Promise<any> {
    const { username, password } = loginDto;

    // 1. Try to find in Admin table
    let user: Admin | Employee | null = await this.adminRepository.findOne({
      where: { username },
      relations: ['roles', 'roles.permissions'],
    });
    let isAdmin = true;

    // 2. Try to find in Employee table if not found in Admin
    if (!user) {
      user = await this.employeeRepository.findOne({
        where: { username },
        relations: ['roles', 'roles.permissions'],
      });
      isAdmin = false;
    }

    // Check lockout status if user exists
    if (user && user.locked_until) {
      const now = new Date();
      if (user.locked_until > now) {
        const remainingMs = user.locked_until.getTime() - now.getTime();
        const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
        const remainingHours = Math.ceil(remainingMs / (3600 * 1000));

        let timeStr = `${remainingMinutes} minute(s)`;
        if (remainingMinutes > 60) {
          timeStr = `${remainingHours} hour(s)`;
        }

        throw new ForbiddenException(
          `This account is temporarily locked due to multiple failed login attempts. Please try again after ${timeStr}.`
        );
      }
    }

    // Check credentials
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      // Record failed audit attempt
      await this.loginAttemptRepository.save(
        this.loginAttemptRepository.create({
          username,
          ip_address: ipAddress || 'unknown',
          is_successful: false,
          failure_reason: !user ? 'User not found' : 'Invalid password',
        }),
      );

      if (user) {
        // Increment failed attempts
        user.failed_login_attempts += 1;
        const attempts = user.failed_login_attempts;
        let lockMessage = 'Invalid username or password.';

        if (attempts === 3) {
          user.locked_until = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
          lockMessage = 'Account temporarily locked for 5 minutes due to multiple failed attempts.';
        } else if (attempts === 6) {
          user.locked_until = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
          lockMessage = 'Account temporarily locked for 10 minutes due to multiple failed attempts.';
        } else if (attempts >= 9) {
          user.locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          lockMessage = 'Account temporarily locked for 24 hours due to multiple failed attempts.';
        } else {
          let remaining = 0;
          if (attempts < 3) {
            remaining = 3 - attempts;
          } else if (attempts < 6) {
            remaining = 6 - attempts;
          } else {
            remaining = 9 - attempts;
          }
          lockMessage = `Invalid username or password. You have ${remaining} attempts remaining before account lockout.`;
        }

        if (isAdmin) {
          await this.adminRepository.save(user as Admin);
        } else {
          await this.employeeRepository.save(user as Employee);
        }

        // Track lockout event in audit log
        if (attempts === 3 || attempts === 6 || attempts >= 9) {
          const userId = isAdmin ? (user as Admin).admin_id.toString() : (user as Employee).employee_id.toString();
          await this.auditService.logAction({
            userId,
            action: 'USER_LOCKOUT',
            resource: 'AuthModule',
            ipAddress: ipAddress || 'unknown',
            details: `User ${username} locked out. Failed attempts: ${attempts}. Locked until: ${user.locked_until.toISOString()}`,
          });
        }

        throw new UnauthorizedException(lockMessage);
      }

      throw new UnauthorizedException('Invalid username or password.');
    }

    // Success - Reset counters if they had any failed attempts
    if (user.failed_login_attempts > 0 || user.locked_until) {
      user.failed_login_attempts = 0;
      user.locked_until = null;
    }

    user.last_login_at = new Date();
    user.login_count += 1;

    if (isAdmin) {
      await this.adminRepository.save(user as Admin);
    } else {
      await this.employeeRepository.save(user as Employee);
    }

    // Record successful audit attempt
    await this.loginAttemptRepository.save(
      this.loginAttemptRepository.create({
        username,
        ip_address: ipAddress || 'unknown',
        is_successful: true,
      }),
    );

    const userId = isAdmin ? (user as Admin).admin_id.toString() : (user as Employee).employee_id.toString();
    await this.auditService.logAction({
      userId,
      action: 'USER_LOGIN',
      resource: 'AuthModule',
      ipAddress: ipAddress || 'unknown',
      details: `User ${username} successfully authenticated.`,
    });

    return this.generateAuthResponse(user, isAdmin);
  }

  async generateAuthResponse(user: Employee | Admin, isAdmin: boolean) {
    const roles = user.roles ? user.roles.map((r) => r.name) : [];
    
    const permissionsSet = new Set<string>();
    if (user.roles) {
      user.roles.forEach((role) => {
        if (role.permissions) {
          role.permissions.forEach((perm) => permissionsSet.add(perm.code));
        }
      });
    }
    const permissions = Array.from(permissionsSet);
    const userId = isAdmin ? (user as Admin).admin_id.toString() : (user as Employee).employee_id.toString();

    const payload = {
      sub: userId,
      username: user.username,
      roles,
      permissions,
      isAdmin,
      profilePictureUrl: isAdmin ? (user as Admin).profile_picture_url : (user as Employee).employee_picture_url,
      isFirstLogin: !isAdmin && (user as Employee).password_change_count === 0,
      isHRManager: !isAdmin && (user as Employee).department_id === 1 && (user as Employee).title === 'Manager',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'his_super_secret_access_key_change_in_prod_2026',
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'his_super_secret_refresh_key_change_in_prod_2026',
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    });

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    const tokenInstance = this.refreshTokenRepository.create({
      token: refreshToken,
      expires_at: expiry,
      is_revoked: false,
    });

    if (isAdmin) {
      tokenInstance.admin = user as Admin;
    } else {
      tokenInstance.employee = user as Employee;
    }

    await this.refreshTokenRepository.save(tokenInstance);

    return {
      accessToken,
      refreshToken,
      user: {
        id: userId,
        username: user.username,
        roles,
        profilePictureUrl: isAdmin ? (user as Admin).profile_picture_url : (user as Employee).employee_picture_url,
        isFirstLogin: !isAdmin && (user as Employee).password_change_count === 0,
        isHRManager: !isAdmin && (user as Employee).department_id === 1 && (user as Employee).title === 'Manager',
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<any> {
    const { token } = refreshTokenDto;
    
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'his_super_secret_refresh_key_change_in_prod_2026',
      });

      const isAdmin = decoded.isAdmin === true;
      let tokenRecord: RefreshToken | null = null;

      if (isAdmin) {
        tokenRecord = await this.refreshTokenRepository.findOne({
          where: { token, is_revoked: false },
          relations: ['admin', 'admin.roles', 'admin.roles.permissions'],
        });
      } else {
        tokenRecord = await this.refreshTokenRepository.findOne({
          where: { token, is_revoked: false },
          relations: ['employee', 'employee.roles', 'employee.roles.permissions'],
        });
      }

      if (!tokenRecord || tokenRecord.expires_at < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token.');
      }

      const user = isAdmin ? tokenRecord.admin : tokenRecord.employee;
      if (!user) {
        throw new UnauthorizedException('User associated with token not found.');
      }

      tokenRecord.is_revoked = true;
      await this.refreshTokenRepository.save(tokenRecord);

      return this.generateAuthResponse(user, isAdmin);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  async updateProfile(userId: string, username: string, newPassword?: string, profilePictureUrl?: string, ipAddress?: string): Promise<any> {
    const parsedId = parseInt(userId, 10);
    let user: Admin | Employee | null = null;
    let isAdmin = false;

    if (!isNaN(parsedId)) {
      user = await this.adminRepository.findOne({
        where: { admin_id: parsedId },
        relations: ['roles', 'roles.permissions'],
      });
      if (user) {
        isAdmin = true;
      } else {
        user = await this.employeeRepository.findOne({
          where: { employee_id: parsedId },
          relations: ['roles', 'roles.permissions'],
        });
      }
    }

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (username !== user.username) {
      // Check admins
      const existingAdmin = await this.adminRepository.findOne({ where: { username } });
      const existingEmployee = await this.employeeRepository.findOne({ where: { username } });
      if (existingAdmin || existingEmployee) {
        throw new ForbiddenException('Username is already taken.');
      }
      user.username = username;
    }

    if (newPassword) {
      const saltRounds = 10;
      user.password_hash = await bcrypt.hash(newPassword, saltRounds);
      user.password_change_count += 1;
      user.last_password_change_at = new Date();
    }

    if (profilePictureUrl !== undefined) {
      if (isAdmin) {
        (user as Admin).profile_picture_url = profilePictureUrl;
      } else {
        (user as Employee).employee_picture_url = profilePictureUrl;
      }
    }

    if (isAdmin) {
      await this.adminRepository.save(user as Admin);
    } else {
      await this.employeeRepository.save(user as Employee);
    }

    await this.auditService.logAction({
      userId,
      action: 'USER_PROFILE_UPDATE',
      resource: 'AuthModule',
      ipAddress: ipAddress || 'unknown',
      details: `User profile updated. Username changed to "${username}". Password changed: ${!!newPassword}`,
    });

    return {
      success: true,
      user: {
        id: userId,
        username: user.username,
        profilePictureUrl: isAdmin ? (user as Admin).profile_picture_url : (user as Employee).employee_picture_url,
      }
    };
  }

  async getMe(userId: string): Promise<any> {
    // Try admin first
    const admin = await this.adminRepository.findOne({
      where: { admin_id: parseInt(userId, 10) },
      relations: ['roles'],
    });
    if (admin) {
      return {
        id: admin.admin_id,
        username: admin.username,
        isAdmin: true,
        profilePictureUrl: admin.profile_picture_url,
        roles: admin.roles?.map(r => r.name) || [],
      };
    }

    const emp = await this.employeeRepository.findOne({
      where: { employee_id: parseInt(userId, 10) },
      relations: ['roles'],
    });
    if (!emp) throw new UnauthorizedException('User not found.');

    return {
      id: emp.employee_id,
      username: emp.username,
      isAdmin: false,
      email: emp.email,
      salary: emp.salary,
      title: emp.title,
      department_id: emp.department_id,
      employment_type: emp.employment_type,
      english_first_name: emp.english_first_name,
      english_last_name: emp.english_last_name,
      arabic_first_name: emp.arabic_first_name,
      arabic_last_name: emp.arabic_last_name,
      phone_number: emp.phone_number,
      gender: emp.gender,
      date_of_birth: emp.date_of_birth,
      employee_picture_url: emp.employee_picture_url,
      password_change_count: emp.password_change_count,
      isFirstLogin: emp.password_change_count === 0,
      isHRManager: emp.department_id === 1 && emp.title === 'Manager',
      roles: emp.roles?.map(r => r.name) || [],
    };
  }

  async logout(): Promise<{ success: boolean }> {
    return { success: true };
  }
}
