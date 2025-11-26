import { MigrationInterface, QueryRunner } from "typeorm";

export class Contracttype1764139518550 implements MigrationInterface {
    name = 'Contracttype1764139518550'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_types" ADD "primary_form_keys" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_types" DROP COLUMN "primary_form_keys"`);
    }

}
