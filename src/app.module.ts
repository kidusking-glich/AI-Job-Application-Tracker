import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CoreModule } from './core/core.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { AiModule } from './modules/ai/ai.module';
import { EmailModule } from './modules/email/email.module';
import { AdminModule } from './modules/admin/admin.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Serve the built React frontend from the same origin as the API, with an
    // SPA fallback for BrowserRouter routes. API routes stay on /api/*.
    ServeStaticModule.forRoot({
      // Compiled app.module.js lives in <root>/dist, so '..' lands on the
      // project root where the built frontend sits. Works on Vercel, Docker
      // (WORKDIR /app) and local start:prod regardless of process.cwd().
      rootPath: join(__dirname, '..', 'frontend', 'dist'),
      exclude: ['/api/{*splat}'],
    }),
    CoreModule,
    UsersModule,
    AuthModule,
    ContractsModule,
    AnalysisModule,
    AiModule,
    EmailModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
