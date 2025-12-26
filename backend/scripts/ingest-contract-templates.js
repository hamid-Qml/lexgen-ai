#!/usr/bin/env node

// Skeleton ingest for spreadsheet templates.
// Requires: npm i xlsx (or yarn add xlsx)

const fs = require('fs');
const path = require('path');

// Lazy require so the file can exist without the dependency installed.
let xlsx;
try {
  xlsx = require('xlsx');
} catch (err) {
  console.error('Missing dependency: xlsx. Install with `npm i xlsx`.');
  process.exit(1);
}

const INPUT_DIR = path.resolve(__dirname, '../../Data/Employement/Spreadsheets');

function sheetToObjects(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });
  return rows;
}

function readTemplate(filePath) {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  return {
    filePath,
    metadata: sheetToObjects(workbook, 'Metadata')[0] || {},
    sections: sheetToObjects(workbook, 'Sections'),
    questions: sheetToObjects(workbook, 'Questions'),
    questionOptions: sheetToObjects(workbook, 'Question Options'),
    clauseEffects: sheetToObjects(workbook, 'Clause Effects'),
    clauses: sheetToObjects(workbook, 'Clauses'),
    clauseVariants: sheetToObjects(workbook, 'Clause Variants'),
    variantVariables: sheetToObjects(workbook, 'Variant Variables'),
    clauseTriggers: sheetToObjects(workbook, 'Clause Triggers'),
    variables: sheetToObjects(workbook, 'Variables'),
    dependencyRules: sheetToObjects(workbook, 'Dependency Rules'),
    complianceRules: sheetToObjects(workbook, 'Compliance Rules'),
    frameworks: sheetToObjects(workbook, 'Frameworks'),
    apiSchema: sheetToObjects(workbook, 'API Schema')
  };
}

function buildSeed(template) {
  // TODO: Map spreadsheet rows into your template entities.
  // Keep this function pure so it can be tested without a DB connection.
  return {
    contractTypeCode: template.metadata.contract_type_code,
    contractTypeName: template.metadata.contract_type_name,
    version: template.metadata.version,
    generatedAt: template.metadata.generated_at,
    sourceFile: template.filePath,
    sections: template.sections,
    questions: template.questions,
    questionOptions: template.questionOptions,
    clauses: template.clauses,
    clauseVariants: template.clauseVariants,
    variantVariables: template.variantVariables,
    clauseEffects: template.clauseEffects,
    clauseTriggers: template.clauseTriggers,
    variables: template.variables,
    dependencyRules: template.dependencyRules,
    complianceRules: template.complianceRules,
    frameworks: template.frameworks,
    apiSchema: template.apiSchema
  };
}

async function persistSeed(seed) {
  // TODO: Wire into TypeORM using AppDataSource and new template entities.
  // Example: create template version, then bulk insert sections/questions/clauses.
  console.log(`Prepared seed for ${seed.contractTypeCode} (${seed.version})`);
}

async function main() {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('.xlsx'));
  if (!files.length) {
    console.error(`No .xlsx files found in ${INPUT_DIR}`);
    process.exit(1);
  }

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const template = readTemplate(filePath);
    const seed = buildSeed(template);
    await persistSeed(seed);
  }

  console.log('Ingestion complete.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
