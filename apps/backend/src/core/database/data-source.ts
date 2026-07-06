import { DataSource } from 'typeorm';
import { Employee } from '../../modules/auth/entities/employee.entity';
import { Admin } from '../../modules/auth/entities/admin.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { LoginAttempt } from '../../modules/auth/entities/login-attempt.entity';
import { Role } from '../../modules/rbac/entities/role.entity';
import { Permission } from '../../modules/rbac/entities/permission.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'his_secure_password_2026',
        database: process.env.DB_DATABASE || 'his_db',
      }),
  synchronize: false, // Explicitly false for production migrations runs
  logging: true,
  entities: [Employee, Admin, RefreshToken, LoginAttempt, Role, Permission],
  migrations: ['dist/migrations/*.js'],
  subscribers: [],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
