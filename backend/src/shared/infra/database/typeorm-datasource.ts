import { DataSource } from 'typeorm'
import { UserTypeOrmEntity } from '@/shared/infra/persistence/typeorm/user/user.typeorm.entity'
import { ProductTypeOrmEntity } from '@/shared/infra/persistence/typeorm/product/product.typeorm.entity'
import { ShipmentTypeOrmEntity } from '@/shared/infra/persistence/typeorm/shipment/shipment.typeorm.entity'
import { InventoryTypeOrmEntity } from '@/shared/infra/persistence/typeorm/inventory/inventory.typeorm.entity'
import { OwnershipTransferTypeOrmEntity } from '@/shared/infra/persistence/typeorm/ownership-transfer/ownership-transfer.typeorm.entity'
import { SaleTypeOrmEntity } from '@/shared/infra/persistence/typeorm/sale/sale.typeorm.entity'
import { BatchTypeOrmEntity } from '@/shared/infra/persistence/typeorm/batch/batch.typeorm.entity'
import { CategoryTypeOrmEntity } from '@/shared/infra/persistence/typeorm/category/category.typeorm.entity'
import { ProductModelTypeOrmEntity } from '@/shared/infra/persistence/typeorm/product-model/product-model.typeorm.entity'
import { SupplierTypeOrmEntity } from '@/shared/infra/persistence/typeorm/supplier/supplier.typeorm.entity'
import { ReturnTypeOrmEntity } from '@/shared/infra/persistence/typeorm/return/return.typeorm.entity'
import { AppConfigService } from '@/shared/config/app-config.service'
import { ConfigService } from '@nestjs/config'
import * as dotenv from 'dotenv'
import { BadRequestException } from '@nestjs/common'
import * as sqlite3 from 'sqlite3'
import { Init1749406833692 } from '@/shared/infra/database/migrations/1749406833692-Init'
import { AddPerformanceIndexes1749500000000 } from '@/shared/infra/database/migrations/1749500000000-AddPerformanceIndexes'
import { PasswordResetRequestTypeOrmEntity } from '@/shared/infra/persistence/typeorm/auth/password-reset-requests/password-reset-requests.typeorm.entity'
import { CustomerTypeOrmEntity } from '@/shared/infra/persistence/typeorm/customer/customer.typeorm.entity'
import { CustomerPortfolioTypeOrmEntity } from '@/shared/infra/persistence/typeorm/customer-portfolio/customer-portfolio.typeorm.entity'
import { FixMissingColumnsAndTables1774483200000 } from '@/shared/infra/database/migrations/1774483200000-FixMissingColumnsAndTables'
dotenv.config({ path: '.env.development' })

const commonConfig = {
  entities: [
    UserTypeOrmEntity,
    ProductTypeOrmEntity,
    ShipmentTypeOrmEntity,
    InventoryTypeOrmEntity,
    OwnershipTransferTypeOrmEntity,
    SaleTypeOrmEntity,
    BatchTypeOrmEntity,
    CategoryTypeOrmEntity,
    ProductModelTypeOrmEntity,
    SupplierTypeOrmEntity,
    ReturnTypeOrmEntity,
    PasswordResetRequestTypeOrmEntity,
    CustomerTypeOrmEntity,
    CustomerPortfolioTypeOrmEntity
  ],
  migrations: [
    Init1749406833692,
    AddPerformanceIndexes1749500000000,
    FixMissingColumnsAndTables1774483200000
  ],
  synchronize: false
}

let AppDataSource: DataSource

let appConfigService = new AppConfigService(new ConfigService())

switch (appConfigService.getNodeEnv()) {
  case 'development':
    AppDataSource = new DataSource({
      type: 'postgres',
      host: appConfigService.getDatabaseHost(),
      port: appConfigService.getDatabasePort(),
      username: appConfigService.getDatabaseUser(),
      password: appConfigService.getDatabasePassword(),
      database: appConfigService.getDatabaseName(),
      ...commonConfig
    })
    break

  case 'test':
    AppDataSource = new DataSource({
      type: 'sqlite',
      driver: sqlite3,
      database: 'test.sqlite',
      ...commonConfig
    })
    break

  case 'production':
    AppDataSource = new DataSource({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      migrationsRun: true,
      ...commonConfig
    })
    break

  default:
    throw new BadRequestException(`Unknown NODE_ENV: ${process.env.NODE_ENV}`)
}

export { AppDataSource }
