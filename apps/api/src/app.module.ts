import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { HealthController } from "./health.controller";
import { JobsModule } from "./jobs/jobs.module";
import { MarketsModule } from "./markets/markets.module";
import { OrdersModule } from "./orders/orders.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { WalletsModule } from "./wallets/wallets.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env", "../../.env.local", "../../.env"]
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("REDIS_HOST", "localhost"),
          port: config.get<number>("REDIS_PORT", 6379)
        }
      })
    }),
    PrismaModule,
    JobsModule,
    AuthModule,
    AdminModule,
    UsersModule,
    MarketsModule,
    WalletsModule,
    OrdersModule,
    ComplianceModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
