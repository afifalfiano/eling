import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { PrismaModule } from './prisma/prisma.module';
import { SessionMiddleware } from './auth/session.middleware';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }]),
    PrismaModule,
    ItemsModule,
    AuthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SessionMiddleware).forRoutes('*');
  }
}
