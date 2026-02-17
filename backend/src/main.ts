import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './redis-io.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Security headers
    app.use(helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: false,
    }));

    // Winston logger
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    app.enableCors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
    });

    app.setGlobalPrefix('api');

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));

    // Health check endpoint
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/api/health', (_req: any, res: any) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    // Redis WebSocket adapter for horizontal scaling
    if (process.env.REDIS_URL) {
        const redisIoAdapter = new RedisIoAdapter(app);
        await redisIoAdapter.connectToRedis();
        app.useWebSocketAdapter(redisIoAdapter);
    }

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 TaskFlow API running on port ${port}`);
}
bootstrap();
