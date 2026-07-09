import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { getDatabaseConfig } from './core/database/database.config';
import { SecurityInterceptor } from './core/interceptors/security.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { SuggestionsModule } from './modules/suggestions/suggestions.module';
import { ManagementModule } from './modules/management/management.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { BudgetModule } from './modules/budget/budget.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ScheduleModule } from './modules/schedule/schedule.module';

@Module({
  imports: [
    // Global Config Module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
    }),

    // Database Module with TypeORM
    TypeOrmModule.forRootAsync({
      useFactory: () => getDatabaseConfig(),
    }),

    // Rate Limiting (Throttler): Max 10 requests per minute per client IP by default
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),

    // Modular Monolith Domain Modules
    AuthModule,
    RbacModule,
    AuditModule,
    NotificationsModule,
    StorageModule,
    SuggestionsModule,
    ManagementModule,
    DepartmentsModule,
    EmployeesModule,
    BudgetModule,
    MessagesModule,
    ScheduleModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityInterceptor,
    },
  ],
})
export class AppModule {}
