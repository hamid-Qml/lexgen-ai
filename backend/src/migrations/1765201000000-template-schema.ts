import { MigrationInterface, QueryRunner } from "typeorm";

export class TemplateSchema1765201000000 implements MigrationInterface {
    name = 'TemplateSchema1765201000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "contract_template_versions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "contract_type_code" character varying NOT NULL,
            "contract_type_name" character varying NOT NULL,
            "export_type" character varying,
            "version" character varying,
            "generated_at" TIMESTAMPTZ,
            "source_spreadsheet_path" text,
            "source_contract_path" text,
            "is_current" boolean NOT NULL DEFAULT false,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT "PK_contract_template_versions_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_contract_template_versions_code_version" UNIQUE ("contract_type_code", "version")
        )`);

        await queryRunner.query(`CREATE TABLE "template_sections" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "section_code" character varying NOT NULL,
            "name" character varying NOT NULL,
            "display_order" integer NOT NULL,
            CONSTRAINT "PK_template_sections_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_sections_version_code" UNIQUE ("template_version_id", "section_code"),
            CONSTRAINT "FK_template_sections_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_sections_version" ON "template_sections" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_questions" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "question_code" character varying NOT NULL,
            "section_code" character varying NOT NULL,
            "question_text" text NOT NULL,
            "question_type" character varying NOT NULL,
            "is_required" boolean NOT NULL DEFAULT false,
            "variable_key" character varying,
            "has_show_if" boolean NOT NULL DEFAULT false,
            "has_skip_if" boolean NOT NULL DEFAULT false,
            CONSTRAINT "PK_template_questions_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_questions_version_code" UNIQUE ("template_version_id", "question_code"),
            CONSTRAINT "FK_template_questions_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_questions_version" ON "template_questions" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_question_options" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "question_code" character varying NOT NULL,
            "option_value" character varying NOT NULL,
            "option_label" character varying NOT NULL,
            "has_clause_effects" boolean NOT NULL DEFAULT false,
            CONSTRAINT "PK_template_question_options_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_question_options_version" UNIQUE ("template_version_id", "question_code", "option_value"),
            CONSTRAINT "FK_template_question_options_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_question_options_version" ON "template_question_options" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_variables" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "variable_key" character varying NOT NULL,
            "variable_type" character varying NOT NULL,
            "source_question_code" character varying,
            "used_in_clauses" text[] NOT NULL DEFAULT '{}',
            CONSTRAINT "PK_template_variables_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_variables_version_key" UNIQUE ("template_version_id", "variable_key"),
            CONSTRAINT "FK_template_variables_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_variables_version" ON "template_variables" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_clause_categories" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "category_code" character varying NOT NULL,
            "category_name" character varying NOT NULL,
            "display_order" integer,
            CONSTRAINT "PK_template_clause_categories_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_clause_categories_version_code" UNIQUE ("template_version_id", "category_code"),
            CONSTRAINT "FK_template_clause_categories_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_clause_categories_version" ON "template_clause_categories" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_clauses" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "category_code" character varying NOT NULL,
            "category_name" character varying NOT NULL,
            "clause_code" character varying NOT NULL,
            "clause_name" character varying NOT NULL,
            "description" text,
            "status" character varying,
            "default_variant_code" character varying,
            "legislation_reference" text,
            "risk_notes" text,
            "has_triggers" boolean NOT NULL DEFAULT false,
            "variant_count" integer,
            "requires_clauses" text[] NOT NULL DEFAULT '{}',
            "conflicts_with" text[] NOT NULL DEFAULT '{}',
            CONSTRAINT "PK_template_clauses_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_clauses_version_code" UNIQUE ("template_version_id", "clause_code"),
            CONSTRAINT "FK_template_clauses_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_clauses_version" ON "template_clauses" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_clause_variants" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "clause_code" character varying NOT NULL,
            "variant_code" character varying NOT NULL,
            "variant_name" character varying NOT NULL,
            "is_default" boolean NOT NULL DEFAULT false,
            "use_case" text,
            "full_text" text NOT NULL,
            "variable_count" integer,
            "variables_list" text[] NOT NULL DEFAULT '{}',
            CONSTRAINT "PK_template_clause_variants_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_clause_variants_version_code" UNIQUE ("template_version_id", "clause_code", "variant_code"),
            CONSTRAINT "FK_template_clause_variants_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_clause_variants_version" ON "template_clause_variants" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_variant_variables" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "clause_code" character varying NOT NULL,
            "variant_code" character varying NOT NULL,
            "variable_key" character varying NOT NULL,
            "variable_type" character varying NOT NULL,
            "is_required" boolean NOT NULL DEFAULT false,
            "label" character varying,
            "default_value" jsonb,
            CONSTRAINT "PK_template_variant_variables_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_variant_variables_version" UNIQUE ("template_version_id", "clause_code", "variant_code", "variable_key"),
            CONSTRAINT "FK_template_variant_variables_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_variant_variables_version" ON "template_variant_variables" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_clause_effects" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "question_code" character varying NOT NULL,
            "option_value" character varying NOT NULL,
            "clause_code" character varying NOT NULL,
            "action" character varying NOT NULL,
            "variant_code" character varying,
            CONSTRAINT "PK_template_clause_effects_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_clause_effects_version" UNIQUE ("template_version_id", "question_code", "option_value", "clause_code", "action", "variant_code"),
            CONSTRAINT "FK_template_clause_effects_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_clause_effects_version" ON "template_clause_effects" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_clause_triggers" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "clause_code" character varying NOT NULL,
            "trigger_index" integer NOT NULL,
            "condition_field" character varying NOT NULL,
            "condition_operator" character varying NOT NULL,
            "condition_value" character varying NOT NULL,
            "result_status" character varying,
            "result_variant" character varying,
            "reason" text,
            CONSTRAINT "PK_template_clause_triggers_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_clause_triggers_version" UNIQUE ("template_version_id", "clause_code", "trigger_index"),
            CONSTRAINT "FK_template_clause_triggers_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_clause_triggers_version" ON "template_clause_triggers" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_dependency_rules" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "rule_code" character varying NOT NULL,
            "rule_type" character varying NOT NULL,
            "description" text,
            CONSTRAINT "PK_template_dependency_rules_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_dependency_rules_version" UNIQUE ("template_version_id", "rule_code"),
            CONSTRAINT "FK_template_dependency_rules_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_dependency_rules_version" ON "template_dependency_rules" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_compliance_rules" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "rule_code" character varying NOT NULL,
            "framework" character varying NOT NULL,
            "description" text,
            CONSTRAINT "PK_template_compliance_rules_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_compliance_rules_version" UNIQUE ("template_version_id", "rule_code"),
            CONSTRAINT "FK_template_compliance_rules_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_compliance_rules_version" ON "template_compliance_rules" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_frameworks" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "framework_code" character varying NOT NULL,
            "name" character varying NOT NULL,
            "requirement_count" integer,
            CONSTRAINT "PK_template_frameworks_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_frameworks_version" UNIQUE ("template_version_id", "framework_code"),
            CONSTRAINT "FK_template_frameworks_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_frameworks_version" ON "template_frameworks" ("template_version_id")`);

        await queryRunner.query(`CREATE TABLE "template_api_schema_fields" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "template_version_id" uuid NOT NULL,
            "field_name" character varying NOT NULL,
            "field_type" character varying NOT NULL,
            "is_required" boolean NOT NULL DEFAULT false,
            CONSTRAINT "PK_template_api_schema_fields_id" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_template_api_schema_fields_version" UNIQUE ("template_version_id", "field_name"),
            CONSTRAINT "FK_template_api_schema_fields_version" FOREIGN KEY ("template_version_id") REFERENCES "contract_template_versions"("id") ON DELETE CASCADE
        )`);
        await queryRunner.query(`CREATE INDEX "IDX_template_api_schema_fields_version" ON "template_api_schema_fields" ("template_version_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_template_api_schema_fields_version"`);
        await queryRunner.query(`DROP TABLE "template_api_schema_fields"`);
        await queryRunner.query(`DROP INDEX "IDX_template_frameworks_version"`);
        await queryRunner.query(`DROP TABLE "template_frameworks"`);
        await queryRunner.query(`DROP INDEX "IDX_template_compliance_rules_version"`);
        await queryRunner.query(`DROP TABLE "template_compliance_rules"`);
        await queryRunner.query(`DROP INDEX "IDX_template_dependency_rules_version"`);
        await queryRunner.query(`DROP TABLE "template_dependency_rules"`);
        await queryRunner.query(`DROP INDEX "IDX_template_clause_triggers_version"`);
        await queryRunner.query(`DROP TABLE "template_clause_triggers"`);
        await queryRunner.query(`DROP INDEX "IDX_template_clause_effects_version"`);
        await queryRunner.query(`DROP TABLE "template_clause_effects"`);
        await queryRunner.query(`DROP INDEX "IDX_template_variant_variables_version"`);
        await queryRunner.query(`DROP TABLE "template_variant_variables"`);
        await queryRunner.query(`DROP INDEX "IDX_template_clause_variants_version"`);
        await queryRunner.query(`DROP TABLE "template_clause_variants"`);
        await queryRunner.query(`DROP INDEX "IDX_template_clauses_version"`);
        await queryRunner.query(`DROP TABLE "template_clauses"`);
        await queryRunner.query(`DROP INDEX "IDX_template_clause_categories_version"`);
        await queryRunner.query(`DROP TABLE "template_clause_categories"`);
        await queryRunner.query(`DROP INDEX "IDX_template_variables_version"`);
        await queryRunner.query(`DROP TABLE "template_variables"`);
        await queryRunner.query(`DROP INDEX "IDX_template_question_options_version"`);
        await queryRunner.query(`DROP TABLE "template_question_options"`);
        await queryRunner.query(`DROP INDEX "IDX_template_questions_version"`);
        await queryRunner.query(`DROP TABLE "template_questions"`);
        await queryRunner.query(`DROP INDEX "IDX_template_sections_version"`);
        await queryRunner.query(`DROP TABLE "template_sections"`);
        await queryRunner.query(`DROP TABLE "contract_template_versions"`);
    }
}
