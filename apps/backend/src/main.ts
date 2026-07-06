import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as express from 'express';

// Load environment variables before importing AppModule so decorators have access to process.env
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(__dirname, '../../../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './core/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Create NestJS app instance
  const app = await NestFactory.create(AppModule);

  // Set Global Prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Enable URI Versioning (e.g., /api/v1/auth)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Enable CORS
  app.enableCors({
    origin: [
      'https://his7-1.onrender.com',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Serve static local uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips non-decorated properties from payloads
      transform: true, // Automatically transforms payloads to match DTO classes
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Setup Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hospital Information System (HIS) API')
    .setDescription('Modular Monolith Backend API for Hospital Management, Records, Audit, and Communications.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Token',
        in: 'header',
      },
      'JWT-auth', // This name matches the security decorator
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`====================================================`);
  logger.log(`🚀 HIS Backend Services successfully initiated!`);
  logger.log(`📂 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📶 Listening on port: ${port}`);
  logger.log(`📄 Swagger Docs available at: http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`====================================================`);
}

bootstrap();
