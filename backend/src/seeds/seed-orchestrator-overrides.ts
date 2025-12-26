import fs from 'fs';
import path from 'path';
import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { TemplateVariableAlias } from '../orchestrator/entities/template-variable-alias.entity';
import { TemplateVariableDerivation } from '../orchestrator/entities/template-variable-derivation.entity';
import { TemplateDecisionQuestion } from '../orchestrator/entities/template-decision-question.entity';
import { TemplateMissingVariableQuestion } from '../orchestrator/entities/template-missing-variable-question.entity';

type SeedPayload = {
  template_version_code: string;
  template_variable_aliases?: Array<Record<string, unknown>>;
  template_variable_derivations?: Array<Record<string, unknown>>;
  template_decision_questions?: Array<Record<string, unknown>>;
  template_missing_variable_questions?: Array<Record<string, unknown>>;
};

const SEED_DIR = path.resolve(__dirname, '../../docs/orchestrator');

function getSeedFiles(): string[] {
  if (!fs.existsSync(SEED_DIR)) {
    return [];
  }

  return fs
    .readdirSync(SEED_DIR)
    .filter((file) => file.endsWith('-seed-rows.json'))
    .map((file) => path.join(SEED_DIR, file));
}

function loadSeed(filePath: string): SeedPayload {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SeedPayload;
}

function valueOrNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

async function seedAliases(
  repo: Repository<TemplateVariableAlias>,
  rows: Array<Record<string, unknown>>,
) {
  const mapped = rows.map((row) => ({
    templateVersionCode: String(row.template_version_code),
    aliasKey: String(row.alias_key),
    targetKey: String(row.target_key),
    confidence: row.confidence === undefined ? null : Number(row.confidence),
    notes: valueOrNull(row.notes as string | undefined),
  }));

  if (mapped.length) {
    await repo.upsert(mapped, ['templateVersionCode', 'aliasKey']);
  }

  return mapped.length;
}

async function seedDerivations(
  repo: Repository<TemplateVariableDerivation>,
  rows: Array<Record<string, unknown>>,
) {
  const mapped = rows.map((row) => ({
    templateVersionCode: String(row.template_version_code),
    variableKey: String(row.variable_key),
    expression: String(row.expression),
    dependsOn: Array.isArray(row.depends_on) ? row.depends_on.map(String) : [],
  }));

  if (mapped.length) {
    await repo.upsert(mapped, ['templateVersionCode', 'variableKey']);
  }

  return mapped.length;
}

async function seedDecisionQuestions(
  repo: Repository<TemplateDecisionQuestion>,
  rows: Array<Record<string, unknown>>,
) {
  const mapped = rows.map((row) => ({
    templateVersionCode: String(row.template_version_code),
    questionKey: String(row.question_key),
    decisionKey: String(row.decision_key),
    text: String(row.text),
    inputType: String(row.input_type),
    options: valueOrNull(row.options as unknown[] | undefined),
    required: Boolean(row.required),
    showIf: valueOrNull(row.show_if as Record<string, unknown> | undefined),
    effects: valueOrNull(row.effects as Record<string, unknown>[] | undefined),
  }));

  if (mapped.length) {
    await (repo as any).upsert(mapped, ['templateVersionCode', 'questionKey']);
  }

  return mapped.length;
}

async function seedMissingQuestions(
  repo: Repository<TemplateMissingVariableQuestion>,
  rows: Array<Record<string, unknown>>,
) {
  const mapped = rows.map((row) => ({
    templateVersionCode: String(row.template_version_code),
    questionKey: String(row.question_key),
    variableKey: String(row.variable_key),
    text: String(row.text),
    inputType: String(row.input_type),
    options: valueOrNull(row.options as unknown[] | undefined),
    allowCustom: Boolean(row.allow_custom),
    required: Boolean(row.required),
    showIf: valueOrNull(row.show_if as Record<string, unknown> | undefined),
    priority: valueOrNull(row.priority as string | undefined),
    defaultValue: valueOrNull(row.default_value as unknown | undefined),
    unit: valueOrNull(row.unit as string | undefined),
  }));

  if (mapped.length) {
    await (repo as any).upsert(mapped, ['templateVersionCode', 'questionKey']);
  }

  return mapped.length;
}

async function run() {
  const seedFiles = getSeedFiles();
  if (!seedFiles.length) {
    console.log(`No seed files found in ${SEED_DIR}`);
    return;
  }

  await AppDataSource.initialize();

  try {
    const aliasRepo = AppDataSource.getRepository(TemplateVariableAlias);
    const derivationRepo = AppDataSource.getRepository(TemplateVariableDerivation);
    const decisionRepo = AppDataSource.getRepository(TemplateDecisionQuestion);
    const missingRepo = AppDataSource.getRepository(TemplateMissingVariableQuestion);

    for (const filePath of seedFiles) {
      const payload = loadSeed(filePath);
      const aliasCount = await seedAliases(
        aliasRepo,
        payload.template_variable_aliases ?? [],
      );
      const derivationCount = await seedDerivations(
        derivationRepo,
        payload.template_variable_derivations ?? [],
      );
      const decisionCount = await seedDecisionQuestions(
        decisionRepo,
        payload.template_decision_questions ?? [],
      );
      const missingCount = await seedMissingQuestions(
        missingRepo,
        payload.template_missing_variable_questions ?? [],
      );

      console.log(
        `Seeded ${path.basename(filePath)}: aliases=${aliasCount}, derivations=${derivationCount}, ` +
          `decision_questions=${decisionCount}, missing_questions=${missingCount}`,
      );
    }
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
