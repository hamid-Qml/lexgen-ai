import { MigrationInterface, QueryRunner } from "typeorm";

export class ContractQuestionTemplates1765202000000 implements MigrationInterface {
    name = 'ContractQuestionTemplates1765202000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'contract_question_templates_input_type_enum'
                ) THEN
                    CREATE TYPE "contract_question_templates_input_type_enum" AS ENUM (
                        'text',
                        'textarea',
                        'select',
                        'number',
                        'date',
                        'multi_select'
                    );
                END IF;
            END
            $$;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'contract_question_templates_complexity_level_enum'
                ) THEN
                    CREATE TYPE "contract_question_templates_complexity_level_enum" AS ENUM (
                        'basic',
                        'standard',
                        'complex'
                    );
                END IF;
            END
            $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "contract_question_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "order" integer NOT NULL,
                "question_key" character varying NOT NULL,
                "label" character varying NOT NULL,
                "description" character varying,
                "input_type" "contract_question_templates_input_type_enum" NOT NULL DEFAULT 'text',
                "options" jsonb,
                "is_required" boolean NOT NULL DEFAULT true,
                "complexity_level" "contract_question_templates_complexity_level_enum" NOT NULL DEFAULT 'standard',
                "contractTypeId" uuid,
                CONSTRAINT "PK_contract_question_templates_id" PRIMARY KEY ("id"),
                CONSTRAINT "FK_contract_question_templates_contract_type" FOREIGN KEY ("contractTypeId") REFERENCES "contract_types"("id") ON DELETE SET NULL
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_contract_question_templates_contract_type" ON "contract_question_templates" ("contractTypeId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contract_question_templates_contract_type"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "contract_question_templates"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "contract_question_templates_complexity_level_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "contract_question_templates_input_type_enum"`);
    }
}
