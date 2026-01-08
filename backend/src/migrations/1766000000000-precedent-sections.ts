import { MigrationInterface, QueryRunner } from 'typeorm';

export class PrecedentSections1766000000000 implements MigrationInterface {
    name = 'PrecedentSections1766000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "precedent_documents" ADD COLUMN IF NOT EXISTS "front_matter" jsonb`,
        );
        await queryRunner.query(
            `ALTER TABLE "precedent_documents" ADD COLUMN IF NOT EXISTS "sections" jsonb`,
        );
        await queryRunner.query(
            `ALTER TABLE "precedent_documents" ADD COLUMN IF NOT EXISTS "placeholders" jsonb`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "precedent_documents" DROP COLUMN IF EXISTS "placeholders"`,
        );
        await queryRunner.query(
            `ALTER TABLE "precedent_documents" DROP COLUMN IF EXISTS "sections"`,
        );
        await queryRunner.query(
            `ALTER TABLE "precedent_documents" DROP COLUMN IF EXISTS "front_matter"`,
        );
    }
}
