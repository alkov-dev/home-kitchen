import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AuthModule } from './auth.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:50051',
        package: 'auth',
        protoPath: join(__dirname, '../proto/auth.proto'),
        onLoadPackageDefinition: (pkg, server) => {
          console.log('gRPC Package loaded successfully');
        },
      },
    },
  );

  await app.listen();
  console.log(' Auth Microservice is running on port 50051');
  console.log('📡 gRPC server listening at 0.0.0.0:50051');
}

bootstrap().catch((err) => {
  console.error('❌ Error starting auth microservice:', err);
  process.exit(1);
});