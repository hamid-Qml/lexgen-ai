import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../data-source';
import { ContractTemplateVersion } from '../contract-templates/entities/contract-template-version.entity';
import { TemplateSection } from '../contract-templates/entities/template-section.entity';
import { TemplateQuestion } from '../contract-templates/entities/template-question.entity';
import { TemplateQuestionOption } from '../contract-templates/entities/template-question-option.entity';
import { TemplateVariable } from '../contract-templates/entities/template-variable.entity';
import { TemplateClauseCategory } from '../contract-templates/entities/template-clause-category.entity';
import { TemplateClause } from '../contract-templates/entities/template-clause.entity';
import { TemplateClauseVariant } from '../contract-templates/entities/template-clause-variant.entity';
import { TemplateVariantVariable } from '../contract-templates/entities/template-variant-variable.entity';
import { TemplateClauseEffect } from '../contract-templates/entities/template-clause-effect.entity';
import { TemplateClauseTrigger } from '../contract-templates/entities/template-clause-trigger.entity';
import { TemplateDependencyRule } from '../contract-templates/entities/template-dependency-rule.entity';
import { TemplateComplianceRule } from '../contract-templates/entities/template-compliance-rule.entity';
import { TemplateFramework } from '../contract-templates/entities/template-framework.entity';
import { TemplateApiSchemaField } from '../contract-templates/entities/template-api-schema-field.entity';

const xlsx = require('xlsx');

const SPREADSHEET_DIR = path.resolve(
  __dirname,
  '../../../Data/Employement/Spreadsheets',
);
const CONTRACT_DIR = path.resolve(
  __dirname,
  '../../../Data/Employement/Contracts',
);

function sheetToObjects(workbook: any, sheetName: string): Array<Record<string, any>> {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }
  return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

function toBool(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'yes' || normalized === 'true') {
      return true;
    }
    if (normalized === 'no' || normalized === 'false') {
      return false;
    }
  }
  return defaultValue;
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function splitCsv(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function findContractPath(spreadsheetPath: string): string | null {
  const baseName = path.basename(spreadsheetPath, '.xlsx');
  const candidate = path.join(CONTRACT_DIR, `${baseName}.docx`);
  return fs.existsSync(candidate) ? candidate : null;
}

async function upsertMany(repo: any, rows: any[], conflictColumns: string[]) {
  if (!rows.length) {
    return 0;
  }
  await repo.upsert(rows, conflictColumns);
  return rows.length;
}

async function run() {
  if (!fs.existsSync(SPREADSHEET_DIR)) {
    console.log(`Spreadsheet directory not found: ${SPREADSHEET_DIR}`);
    return;
  }

  const files = fs
    .readdirSync(SPREADSHEET_DIR)
    .filter((file) => file.endsWith('.xlsx'))
    .map((file) => path.join(SPREADSHEET_DIR, file));

  if (!files.length) {
    console.log(`No .xlsx files found in ${SPREADSHEET_DIR}`);
    return;
  }

  await AppDataSource.initialize();

  try {
    const versionRepo = AppDataSource.getRepository(ContractTemplateVersion);
    const sectionRepo = AppDataSource.getRepository(TemplateSection);
    const questionRepo = AppDataSource.getRepository(TemplateQuestion);
    const optionRepo = AppDataSource.getRepository(TemplateQuestionOption);
    const variableRepo = AppDataSource.getRepository(TemplateVariable);
    const categoryRepo = AppDataSource.getRepository(TemplateClauseCategory);
    const clauseRepo = AppDataSource.getRepository(TemplateClause);
    const variantRepo = AppDataSource.getRepository(TemplateClauseVariant);
    const variantVarRepo = AppDataSource.getRepository(TemplateVariantVariable);
    const effectRepo = AppDataSource.getRepository(TemplateClauseEffect);
    const triggerRepo = AppDataSource.getRepository(TemplateClauseTrigger);
    const dependencyRepo = AppDataSource.getRepository(TemplateDependencyRule);
    const complianceRepo = AppDataSource.getRepository(TemplateComplianceRule);
    const frameworkRepo = AppDataSource.getRepository(TemplateFramework);
    const apiSchemaRepo = AppDataSource.getRepository(TemplateApiSchemaField);

    for (const filePath of files) {
      const workbook = xlsx.readFile(filePath, { cellDates: true });
      const metadataRows = sheetToObjects(workbook, 'Metadata');
      const metadata = metadataRows[0] ?? {};

      const contractTypeCode = String(metadata.contract_type_code || '').trim();
      if (!contractTypeCode) {
        console.log(`Skipping ${filePath}: missing contract_type_code.`);
        continue;
      }

      const contractTypeName = String(metadata.contract_type_name || contractTypeCode).trim();
      const version = String(metadata.version || '0.0.0').trim();
      const exportType = metadata.export_type ? String(metadata.export_type).trim() : null;
      const generatedAt = metadata.generated_at ? new Date(metadata.generated_at) : null;
      const sourceSpreadsheetPath = filePath;
      const sourceContractPath = findContractPath(filePath);

      await (versionRepo as any).upsert(
        [
          {
            contractTypeCode,
            contractTypeName,
            exportType,
            version,
            generatedAt,
            sourceSpreadsheetPath,
            sourceContractPath,
            isCurrent: false,
          },
        ],
        ['contractTypeCode', 'version'],
      );

      const templateVersion = await versionRepo.findOne({
        where: { contractTypeCode, version },
      });

      if (!templateVersion) {
        console.log(`Skipping ${filePath}: unable to load template version.`);
        continue;
      }

      const templateVersionId = templateVersion.id;

      const sections = sheetToObjects(workbook, 'Sections').map((row) => ({
        templateVersionId,
        sectionCode: String(row.section_id).trim(),
        name: String(row.name).trim(),
        displayOrder: toInt(row.order) ?? 0,
      }));
      await upsertMany(sectionRepo as any, sections, [
        'templateVersionId',
        'sectionCode',
      ]);

      const questions = sheetToObjects(workbook, 'Questions').map((row) => ({
        templateVersionId,
        questionCode: String(row.question_id).trim(),
        sectionCode: String(row.section_id).trim(),
        questionText: String(row.question_text).trim(),
        questionType: String(row.question_type).trim(),
        isRequired: toBool(row.required),
        variableKey: row.variable_name ? String(row.variable_name).trim() : null,
        hasShowIf: toBool(row.has_show_if),
        hasSkipIf: toBool(row.has_skip_if),
      }));
      await upsertMany(questionRepo as any, questions, [
        'templateVersionId',
        'questionCode',
      ]);

      const questionOptions = sheetToObjects(workbook, 'Question Options').map(
        (row) => ({
          templateVersionId,
          questionCode: String(row.question_id).trim(),
          optionValue: String(row.option_value).trim(),
          optionLabel: String(row.option_label).trim(),
          hasClauseEffects: toBool(row.has_clause_effects),
        }),
      );
      await upsertMany(optionRepo as any, questionOptions, [
        'templateVersionId',
        'questionCode',
        'optionValue',
      ]);

      const variables = sheetToObjects(workbook, 'Variables').map((row) => ({
        templateVersionId,
        variableKey: String(row.variable_name).trim(),
        variableType: String(row.type).trim(),
        sourceQuestionCode: row.source_question ? String(row.source_question).trim() : null,
        usedInClauses: splitCsv(row.used_in_clauses),
      }));
      await upsertMany(variableRepo as any, variables, [
        'templateVersionId',
        'variableKey',
      ]);

      const clauses = sheetToObjects(workbook, 'Clauses').map((row) => ({
        templateVersionId,
        categoryCode: String(row.category_id).trim(),
        categoryName: String(row.category_name).trim(),
        clauseCode: String(row.clause_id).trim(),
        clauseName: String(row.clause_name).trim(),
        description: row.description ? String(row.description).trim() : null,
        status: row.status ? String(row.status).trim() : null,
        defaultVariantCode: row.default_variant_id
          ? String(row.default_variant_id).trim()
          : null,
        legislationReference: row.legislation_reference
          ? String(row.legislation_reference).trim()
          : null,
        riskNotes: row.risk_notes ? String(row.risk_notes).trim() : null,
        hasTriggers: toBool(row.has_triggers),
        variantCount: toInt(row.variant_count),
        requiresClauses: splitCsv(row.requires_clauses),
        conflictsWith: splitCsv(row.conflicts_with),
      }));
      await upsertMany(clauseRepo as any, clauses, [
        'templateVersionId',
        'clauseCode',
      ]);

      const categoryMap = new Map<string, string>();
      clauses.forEach((row) => {
        if (!categoryMap.has(row.categoryCode)) {
          categoryMap.set(row.categoryCode, row.categoryName);
        }
      });
      const categories = Array.from(categoryMap.entries()).map(([code, name]) => ({
        templateVersionId,
        categoryCode: code,
        categoryName: name,
        displayOrder: null,
      }));
      await upsertMany(categoryRepo as any, categories, [
        'templateVersionId',
        'categoryCode',
      ]);

      const clauseVariants = sheetToObjects(workbook, 'Clause Variants').map(
        (row) => ({
          templateVersionId,
          clauseCode: String(row.clause_id).trim(),
          variantCode: String(row.variant_id).trim(),
          variantName: String(row.variant_name).trim(),
          isDefault: toBool(row.is_default),
          useCase: row.use_case ? String(row.use_case).trim() : null,
          fullText: String(row.full_text ?? '').trim(),
          variableCount: toInt(row.variable_count),
          variablesList: splitCsv(row.variables_list),
        }),
      );
      await upsertMany(variantRepo as any, clauseVariants, [
        'templateVersionId',
        'clauseCode',
        'variantCode',
      ]);

      const variantVariables = sheetToObjects(workbook, 'Variant Variables').map(
        (row) => ({
          templateVersionId,
          clauseCode: String(row.clause_id).trim(),
          variantCode: String(row.variant_id).trim(),
          variableKey: String(row.variable_name).trim(),
          variableType: String(row.type).trim(),
          isRequired: toBool(row.required),
          label: row.label ? String(row.label).trim() : null,
          defaultValue: row.default_value ?? null,
        }),
      );
      await upsertMany(variantVarRepo as any, variantVariables, [
        'templateVersionId',
        'clauseCode',
        'variantCode',
        'variableKey',
      ]);

      const clauseEffects = sheetToObjects(workbook, 'Clause Effects').map((row) => ({
        templateVersionId,
        questionCode: String(row.question_id).trim(),
        optionValue: String(row.option_value).trim(),
        clauseCode: String(row.clause_id).trim(),
        action: String(row.action).trim(),
        variantCode: row.variant_id ? String(row.variant_id).trim() : null,
      }));
      await upsertMany(effectRepo as any, clauseEffects, [
        'templateVersionId',
        'questionCode',
        'optionValue',
        'clauseCode',
        'action',
        'variantCode',
      ]);

      const clauseTriggers = sheetToObjects(workbook, 'Clause Triggers').map(
        (row) => ({
          templateVersionId,
          clauseCode: String(row.clause_id).trim(),
          triggerIndex: toInt(row.trigger_index) ?? 0,
          conditionField: String(row.condition_field).trim(),
          conditionOperator: String(row.condition_operator).trim(),
          conditionValue: String(row.condition_value).trim(),
          resultStatus: row.result_status ? String(row.result_status).trim() : null,
          resultVariant: row.result_variant ? String(row.result_variant).trim() : null,
          reason: row.reason ? String(row.reason).trim() : null,
        }),
      );
      await upsertMany(triggerRepo as any, clauseTriggers, [
        'templateVersionId',
        'clauseCode',
        'triggerIndex',
      ]);

      const dependencyRules = sheetToObjects(workbook, 'Dependency Rules').map(
        (row) => ({
          templateVersionId,
          ruleCode: String(row.rule_id).trim(),
          ruleType: String(row.type).trim(),
          description: row.description ? String(row.description).trim() : null,
        }),
      );
      await upsertMany(dependencyRepo as any, dependencyRules, [
        'templateVersionId',
        'ruleCode',
      ]);

      const complianceRules = sheetToObjects(workbook, 'Compliance Rules').map(
        (row) => ({
          templateVersionId,
          ruleCode: String(row.rule_id).trim(),
          framework: String(row.framework).trim(),
          description: row.description ? String(row.description).trim() : null,
        }),
      );
      await upsertMany(complianceRepo as any, complianceRules, [
        'templateVersionId',
        'ruleCode',
      ]);

      const frameworks = sheetToObjects(workbook, 'Frameworks').map((row) => ({
        templateVersionId,
        frameworkCode: String(row.framework_id).trim(),
        name: String(row.name).trim(),
        requirementCount: toInt(row.requirement_count),
      }));
      await upsertMany(frameworkRepo as any, frameworks, [
        'templateVersionId',
        'frameworkCode',
      ]);

      const apiSchema = sheetToObjects(workbook, 'API Schema').map((row) => ({
        templateVersionId,
        fieldName: String(row.field_name).trim(),
        fieldType: String(row.type).trim(),
        isRequired: toBool(row.required),
      }));
      await upsertMany(apiSchemaRepo as any, apiSchema, [
        'templateVersionId',
        'fieldName',
      ]);

      console.log(
        `Imported ${contractTypeCode} ${version}: sections=${sections.length}, questions=${questions.length}, clauses=${clauses.length}`,
      );
    }
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((error) => {
  console.error('Template import failed:', error);
  process.exit(1);
});
