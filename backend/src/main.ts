import { NestFactory } from '@nestjs/core'
import { GlobalExceptionFilter } from '@/shared/infra/filters/http-exceptions.filter'
import { Logger, ValidationPipe } from '@nestjs/common'
import { AppModule } from '@/app.module'
import { AppConfigService } from '@/shared/config/app-config.service'
import { Logger as PinoLogger } from 'nestjs-pino'
import { SwaggerModule } from '@nestjs/swagger'
import { swaggerConfig, swaggerOptions } from '@/shared/config/swagger.config'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  })

  const config = app.get(AppConfigService)
  const corsOrigins = config.getCorsOrigins()
  app.useGlobalFilters(new GlobalExceptionFilter(config))

  app.useLogger(app.get(PinoLogger))
  const port = config.getPort() ?? 3000

  app.enableCors({
    origin:
      corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  )

  const document = SwaggerModule.createDocument(
    app,
    swaggerConfig,
    swaggerOptions
  )
  SwaggerModule.setup('api/docs', app, document)

  await app.listen(port, '0.0.0.0')
  Logger.log(`App running on http://localhost:${port}`, 'Bootstrap')
  Logger.log(
    `Swagger docs available at http://localhost:${port}/api/docs`,
    'Bootstrap'
  )
  Logger.log(
    `Healthcheck available at http://localhost:${port}/health`,
    'Bootstrap'
  )
}

bootstrap()
