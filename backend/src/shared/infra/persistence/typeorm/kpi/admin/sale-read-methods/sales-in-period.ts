import { ParamsWithMandatoryPeriodDto } from '@/shared/common/dtos/params-with-mandatory-period.dto'
import { Repository } from 'typeorm'
import { SaleTypeOrmEntity } from '@/shared/infra/persistence/typeorm/sale/sale.typeorm.entity'
import { UserTypeOrmEntity } from '@/shared/infra/persistence/typeorm/user/user.typeorm.entity'
import { CustomerTypeOrmEntity } from '@/shared/infra/persistence/typeorm/customer/customer.typeorm.entity'
import { ProductTypeOrmEntity } from '@/shared/infra/persistence/typeorm/product/product.typeorm.entity'
import { ProductModelTypeOrmEntity } from '@/shared/infra/persistence/typeorm/product-model/product-model.typeorm.entity'
import { baseWhere } from '@/shared/common/utils/query-builder.helper'
import { SaleReturnRawResult } from '@/modules/kpi/admin/application/dtos/sale/sale-types'
import { SaleReturnProductDto } from '@/modules/kpi/admin/application/dtos/sale/sale-return-product.dto'
import { SaleReturnDto } from '@/modules/kpi/admin/application/dtos/sale/sale-return.dto'
import { SalesInPeriodDto } from '@/modules/kpi/admin/application/dtos/sale/sales-in-period.dto'
import {
  buildProductMap,
  mapProducts
} from '@/modules/kpi/admin/application/helpers/sale-read.helpers'

export async function salesInPeriod(
  saleRepo: Repository<SaleTypeOrmEntity>,
  productRepo: Repository<ProductTypeOrmEntity>,
  qParams: ParamsWithMandatoryPeriodDto
): Promise<SalesInPeriodDto> {
  const qb = saleRepo
    .createQueryBuilder('sale')
    .innerJoin(UserTypeOrmEntity, 'reseller', 'reseller.id = sale.resellerId')
    .leftJoin(
      CustomerTypeOrmEntity,
      'customer',
      'customer.id = sale.customerId'
    )
    .select([
      'sale.id as "id"',
      'sale.saleDate as "saleDate"',
      'sale.totalAmount as "totalAmount"',
      'sale.paymentMethod as "paymentMethod"',
      'sale.numberInstallments as "numberInstallments"',
      'sale.installmentsInterval as "installmentsInterval"',
      'sale.installmentsPaid as "installmentsPaid"',
      'sale.status as "status"',
      'sale.productIds as "productIds"',
      'reseller.id as "resellerId"',
      `CONCAT(reseller.name, ' ', reseller.surname) as "resellerName"`,
      'reseller.phone as "resellerPhone"',
      'customer.id as "customerId"',
      'customer.name as "customerName"',
      'customer.phone as "customerPhone"'
    ])
  const filteredSales = baseWhere(qb, qParams, 'sale.sale_date')
  filteredSales.orderBy('sale.saleDate', 'DESC')
  const rawSales = await filteredSales.getRawMany<SaleReturnRawResult>()
  const allProductIds = [...new Set(rawSales.flatMap((s) => s.productIds))]
  if (allProductIds.length === 0) {
    return {
      start: qParams.start,
      end: qParams.end,
      sales: []
    }
  }
  const allProducts = await productRepo
    .createQueryBuilder('product')
    .innerJoin(ProductModelTypeOrmEntity, 'pm', 'pm.id = product.modelId')
    .where('product.id IN (:...productIds)', { productIds: allProductIds })
    .select([
      'product.id as "productId"',
      'pm.id as "productModelId"',
      'pm.name as "productModelName"',
      'product.salePrice as "salePrice"'
    ])
    .getRawMany<SaleReturnProductDto>()
  const productMap = buildProductMap(allProducts)
  const sales: SaleReturnDto[] = rawSales.map((row) => ({
    id: row.id,
    saleDate: row.saleDate,
    totalAmount: row.totalAmount,
    paymentMethod: row.paymentMethod,
    numberInstallments: row.numberInstallments,
    installmentsInterval: row.installmentsInterval,
    installmentsPaid: row.installmentsPaid,
    status: row.status,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    resellerId: row.resellerId,
    resellerName: row.resellerName,
    resellerPhone: row.resellerPhone,
    products: mapProducts(row.productIds, productMap)
  }))

  return {
    start: qParams.start,
    end: qParams.end,
    sales
  }
}
