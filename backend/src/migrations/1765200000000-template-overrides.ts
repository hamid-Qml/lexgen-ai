import { MigrationInterface, QueryRunner } from "typeorm";

export class TemplateOverrides1765200000000 implements MigrationInterface {
    name = 'TemplateOverrides1765200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "template_variable_aliases" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_code" character varying NOT NULL,
            "alias_key" character varying NOT NULL,
            "target_key" character varying NOT NULL,
            "confidence" double precision,
            "notes" text,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_template_variable_aliases_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_variable_aliases_version_alias" UNIQUE ("template_version_code", "alias_key")
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_variable_aliases_version" ON "template_variable_aliases" ("template_version_code")`);

        await queryRunner.query(`CREATE TABLE "template_variable_derivations" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_code" character varying NOT NULL,
            "variable_key" character varying NOT NULL,
            "expression" text NOT NULL,
            "depends_on" text[] NOT NULL DEFAULT '{}',
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_template_variable_derivations_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_variable_derivations_version_key" UNIQUE ("template_version_code", "variable_key")
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_variable_derivations_version" ON "template_variable_derivations" ("template_version_code")`);

        await queryRunner.query(`CREATE TABLE "template_decision_questions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_code" character varying NOT NULL,
            "question_key" character varying NOT NULL,
            "decision_key" character varying NOT NULL,
            "text" text NOT NULL,
            "input_type" character varying NOT NULL,
            "options" jsonb,
            "required" boolean NOT NULL DEFAULT false,
            "show_if" jsonb,
            "effects" jsonb,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_template_decision_questions_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_decision_questions_version_key" UNIQUE ("template_version_code", "question_key")
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_decision_questions_version" ON "template_decision_questions" ("template_version_code")`);

        await queryRunner.query(`CREATE TABLE "template_missing_variable_questions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_code" character varying NOT NULL,
            "question_key" character varying NOT NULL,
            "variable_key" character varying NOT NULL,
            "text" text NOT NULL,
            "input_type" character varying NOT NULL,
            "options" jsonb,
            "allow_custom" boolean NOT NULL DEFAULT false,
            "required" boolean NOT NULL DEFAULT false,
            "show_if" jsonb,
            "priority" character varying,
            "default_value" jsonb,
            "unit" character varying,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_template_missing_variable_questions_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_missing_variable_questions_version_key" UNIQUE ("template_version_code", "question_key")
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_missing_variable_questions_version" ON "template_missing_variable_questions" ("template_version_code")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_template_missing_variable_questions_version"`);
        await queryRunner.query(`DROP TABLE "template_missing_variable_questions"`);
        await queryRunner.query(`DROP INDEX "IDX_template_decision_questions_version"`);
        await queryRunner.query(`DROP TABLE "template_decision_questions"`);
        await queryRunner.query(`DROP INDEX "IDX_template_variable_derivations_version"`);
        await queryRunner.query(`DROP TABLE "template_variable_derivations"`);
        await queryRunner.query(`DROP INDEX "IDX_template_variable_aliases_version"`);
        await queryRunner.query(`DROP TABLE "template_variable_aliases"`);
    }
}
