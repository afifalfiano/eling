import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { ItemsModule } from './items/items.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ItemsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
