import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1764107347540 implements MigrationInterface {
    name = 'Init1764107347540'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_hash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "full_name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "company_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "company_name" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "abn_acn"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "abn_acn" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "company_address"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "company_address" text`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "industry"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "industry" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "primary_jurisdiction"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "primary_jurisdiction" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "intended_usage"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "intended_usage" character varying(50)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stripe_customer_id"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "stripe_customer_id" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_token_hash"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_token_hash" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_reset_token_hash"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_reset_token_hash" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stripe_customer_id"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "stripe_customer_id" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "intended_usage"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "intended_usage" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "primary_jurisdiction"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "primary_jurisdiction" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "industry"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "industry" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "company_address"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "company_address" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "abn_acn"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "abn_acn" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "company_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "company_name" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "full_name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "full_name" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_hash"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "password_hash" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
    }

}
