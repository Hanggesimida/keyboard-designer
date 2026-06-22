import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // 生产：同域 Nginx 反代，无跨域问题
  // 开发：前端 localhost:3000 直连后端 localhost:3001，需要允许对应 origin
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? false
      : (process.env.CORS_ORIGIN ?? 'http://localhost:3000'),
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
