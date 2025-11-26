import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1764174346789 implements MigrationInterface {
    name = 'Init1764174346789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_types" ADD "clarifying_questions" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contract_types" DROP COLUMN "clarifying_questions"`);
    }

}
