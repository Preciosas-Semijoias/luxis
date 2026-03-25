import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixMissingColumnsAndTables1774483200000
  implements MigrationInterface
{
  name = 'FixMissingColumnsAndTables1774483200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add missing status column to product_models
    await queryRunner.query(
      `CREATE TYPE "public"."product_models_status_enum" AS ENUM('USED', 'ACTIVE', 'ARCHIVED')`
    )
    await queryRunner.query(
      `ALTER TABLE "product_models" ADD "status" "public"."product_models_status_enum" NOT NULL DEFAULT 'ACTIVE'`
    )

    // Create missing customers table
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" uuid NOT NULL, "name" character varying NOT NULL, "phone" character varying NOT NULL, CONSTRAINT "PK_customers" PRIMARY KEY ("id"))`
    )

    // Create missing customer_portfolios table
    await queryRunner.query(
      `CREATE TABLE "customer_portfolios" ("id" uuid NOT NULL, "resellerId" uuid NOT NULL, "customerIds" uuid array NOT NULL DEFAULT '{}', CONSTRAINT "PK_customer_portfolios" PRIMARY KEY ("id"))`
    )

    // Fix password_reset_requests: rename column 'name' to 'username' to match entity
    await queryRunner.query(
      `ALTER TABLE "password_reset_requests" RENAME COLUMN "name" TO "username"`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_reset_requests" RENAME COLUMN "username" TO "name"`
    )
    await queryRunner.query(`DROP TABLE "customer_portfolios"`)
    await queryRunner.query(`DROP TABLE "customers"`)
    await queryRunner.query(`ALTER TABLE "product_models" DROP COLUMN "status"`)
    await queryRunner.query(`DROP TYPE "public"."product_models_status_enum"`)
  }
}
