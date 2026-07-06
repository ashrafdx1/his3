import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
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
    autoLoadEntities: true, // Auto-discovers TypeORM entities in NestJS modules
    synchronize: process.env.DB_SYNCHRONIZE !== 'false', // WARNING: Turn off in production
    logging: !isProd,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    extra: {
      max: 20, // Max connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };
};
