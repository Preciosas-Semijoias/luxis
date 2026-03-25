import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1749406833692 implements MigrationInterface {
  name = 'Init1749406833692'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'RESELLER', 'ASSISTANT', 'UNASSIGNED')`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'DISABLED', 'PENDING')`
    )
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL, "name" character varying NOT NULL, "surname" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "residence" character varying NOT NULL, "status" "public"."users_status_enum" NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('IN_STOCK', 'ASSIGNED', 'SOLD')`
    )
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL, "serial_number" character varying NOT NULL, "model_id" uuid NOT NULL, "batch_id" uuid NOT NULL, "unit_cost" numeric(10,2) NOT NULL, "sale_price" numeric(10,2) NOT NULL, "status" "public"."products_status_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."shipments_status_enum" AS ENUM('PENDING', 'APPROVED', 'DELIVERED', 'CANCELLED')`
    )
    await queryRunner.query(
      `CREATE TABLE "shipments" ("id" uuid NOT NULL, "reseller_id" uuid NOT NULL, "product_ids" uuid array NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."shipments_status_enum" NOT NULL, CONSTRAINT "PK_6deda4532ac542a93eab214b564" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "inventories" ("reseller_id" uuid NOT NULL, "product_ids" uuid array NOT NULL DEFAULT '{}', CONSTRAINT "PK_fe992ae56d514d499936e465dc7" PRIMARY KEY ("reseller_id"))`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."ownership_transfers_status_enum" AS ENUM('PENDING', 'APPROVED', 'FINISHED', 'CANCELLED')`
    )
    await queryRunner.query(
      `CREATE TABLE "ownership_transfers" ("id" uuid NOT NULL, "product_id" uuid NOT NULL, "from_reseller_id" uuid NOT NULL, "to_reseller_id" uuid NOT NULL, "transfer_date" date NOT NULL, "status" "public"."ownership_transfers_status_enum" NOT NULL, CONSTRAINT "PK_e97d3c2e2f6a24be94fb9f087bb" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."sales_payment_method_enum" AS ENUM('CASH', 'PIX', 'DEBIT', 'CREDIT', 'EXCHANGE')`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."sales_status_enum" AS ENUM('CONFIRMED', 'CANCELLED', 'INSTALLMENTS_PENDING', 'INSTALLMENTS_PAID', 'INSTALLMENTS_OVERDUE')`
    )
    await queryRunner.query(
      `CREATE TABLE "sales" ("id" uuid NOT NULL, "customer_id" uuid, "reseller_id" uuid NOT NULL, "product_ids" uuid array NOT NULL, "sale_date" date NOT NULL, "total_amount" numeric(10,2) NOT NULL, "payment_method" "public"."sales_payment_method_enum" NOT NULL, "number_installments" integer NOT NULL, "installments_interval" integer NOT NULL, "status" "public"."sales_status_enum" NOT NULL, "installments_paid" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_4f0bc990ae81dba46da680895ea" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "batches" ("id" uuid NOT NULL, "arrival_date" date NOT NULL, "supplier_id" uuid NOT NULL, CONSTRAINT "PK_55e7ff646e969b61d37eea5be7a" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."categories_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`
    )
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL, "name" character varying NOT NULL, "description" character varying, "status" "public"."categories_status_enum" NOT NULL, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "product_models" ("id" uuid NOT NULL, "name" character varying NOT NULL, "category_id" uuid NOT NULL, "suggested_price" numeric(10,2) NOT NULL, "description" character varying, "photo_url" character varying NOT NULL, CONSTRAINT "PK_ca83f62a01e85b894b9b49551f6" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TABLE "suppliers" ("id" uuid NOT NULL, "name" character varying NOT NULL, "phone" character varying NOT NULL, CONSTRAINT "PK_b70ac51766a9e3144f778cfe81e" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."returns_status_enum" AS ENUM('PENDING', 'APPROVED', 'RETURNED', 'CANCELLED')`
    )
    await queryRunner.query(
      `CREATE TABLE "returns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reseller_id" character varying NOT NULL, "product_ids" uuid array NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."returns_status_enum" NOT NULL, CONSTRAINT "PK_27a2f1895a71519ebfec7850361" PRIMARY KEY ("id"))`
    )
    await queryRunner.query(
      `CREATE TYPE "public"."password_reset_request_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')`
    )
    await queryRunner.query(
      `CREATE TABLE "password_reset_requests" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL, "token" character varying NOT NULL, "status" "public"."password_reset_request_status_enum" NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "approved_at" TIMESTAMP, "rejected_at" TIMESTAMP, "completed_at" TIMESTAMP, CONSTRAINT "UQ_4c8a8f3c8e3b0f6f4e8e2b5c9d1" UNIQUE ("token"), CONSTRAINT "PK_5a6f7e8d9c0b1a2b3c4d5e6f7g8" PRIMARY KEY ("id"))`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "password_reset_requests"`)
    await queryRunner.query(
      `DROP TYPE "public"."password_reset_request_status_enum"`
    )
    await queryRunner.query(`DROP TABLE "returns"`)
    await queryRunner.query(`DROP TYPE "public"."returns_status_enum"`)
    await queryRunner.query(`DROP TABLE "suppliers"`)
    await queryRunner.query(`DROP TABLE "product_models"`)
    await queryRunner.query(`DROP TABLE "categories"`)
    await queryRunner.query(`DROP TYPE "public"."categories_status_enum"`)
    await queryRunner.query(`DROP TABLE "batches"`)
    await queryRunner.query(`DROP TABLE "sales"`)
    await queryRunner.query(`DROP TYPE "public"."sales_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."sales_payment_method_enum"`)
    await queryRunner.query(`DROP TABLE "ownership_transfers"`)
    await queryRunner.query(
      `DROP TYPE "public"."ownership_transfers_status_enum"`
    )
    await queryRunner.query(`DROP TABLE "inventories"`)
    await queryRunner.query(`DROP TABLE "shipments"`)
    await queryRunner.query(`DROP TYPE "public"."shipments_status_enum"`)
    await queryRunner.query(`DROP TABLE "products"`)
    await queryRunner.query(`DROP TYPE "public"."products_status_enum"`)
    await queryRunner.query(`DROP TABLE "users"`)
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`)
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`)
  }
}
