// scripts/seed-contract-types.ts
import { AppDataSource } from "../data-source";
import { ContractType } from "../contract-catalog/entities/contract-type.entity";
import { ContractQuestionTemplate, QuestionInputType } from "../contract-catalog/entities/contract-question-template.entity";
import { ContractCategory, ComplexityLevel } from "src/contract-catalog/entities/contract.enums";

type QuestionSeed = {
  questionKey: string;
  label: string;
  description?: string;
  inputType?: QuestionInputType;
  options?: any;
  isRequired?: boolean;
  order: number;
  complexityLevel?: ComplexityLevel;
};

type ContractTypeSeed = {
  name: string;
  category: ContractCategory;
  complexity: ComplexityLevel;
  jurisdictionDefault?: string;
  primaryFormKeys?: string[];
  questions?: QuestionSeed[];
};

const TYPES: ContractTypeSeed[] = [
  {
    name: "Employment Agreement (Full-Time)",
    category: ContractCategory.EMPLOYMENT,
    complexity: ComplexityLevel.STANDARD,
    jurisdictionDefault: "AU",
    primaryFormKeys: [
      "employer_name",
      "employee_name",
      "job_title",
      "salary_amount",
      "employment_type",
      "start_date",
    ],
    questions: [
      {
        order: 1,
        questionKey: "employer_name",
        label: "Employer Name",
        description: "Full legal name of the employer entity.",
        inputType: QuestionInputType.TEXT,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 2,
        questionKey: "employee_name",
        label: "Employee Name",
        description: "Full legal name of the employee.",
        inputType: QuestionInputType.TEXT,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 3,
        questionKey: "job_title",
        label: "Job Title / Position",
        inputType: QuestionInputType.TEXT,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 4,
        questionKey: "salary_amount",
        label: "Salary Amount",
        description: "e.g. $80,000 per annum (exclusive of superannuation)",
        inputType: QuestionInputType.TEXT,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 5,
        questionKey: "employment_type",
        label: "Employment Type",
        inputType: QuestionInputType.SELECT,
        options: { choices: ["Full-time", "Part-time", "Fixed-term"] },
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 6,
        questionKey: "start_date",
        label: "Employment Start Date",
        inputType: QuestionInputType.DATE,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      // more advanced fields that the chatbot can handle later:
      {
        order: 20,
        questionKey: "probation_period",
        label: "Probation Period",
        description: "e.g. 6 months, or leave blank for none.",
        inputType: QuestionInputType.TEXT,
        isRequired: false,
        complexityLevel: ComplexityLevel.STANDARD,
      },
      {
        order: 21,
        questionKey: "bonus_structure",
        label: "Bonus / Incentive Structure",
        inputType: QuestionInputType.TEXTAREA,
        isRequired: false,
        complexityLevel: ComplexityLevel.COMPLEX,
      },
    ],
  },

  {
    name: "Non-Disclosure Agreement (Mutual)",
    category: ContractCategory.COMMERCIAL,
    complexity: ComplexityLevel.BASIC,
    jurisdictionDefault: "AU",
    primaryFormKeys: [
      "party1_name",
      "party2_name",
      "effective_date",
      "disclosure_purpose",
      "term_years",
    ],
    questions: [
      {
        order: 1,
        questionKey: "party1_name",
        label: "First Party Name",
        inputType: QuestionInputType.TEXT,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 2,
        questionKey: "party2_name",
        label: "Second Party Name",
        inputType: QuestionInputType.TEXT,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 3,
        questionKey: "effective_date",
        label: "Effective Date",
        inputType: QuestionInputType.DATE,
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 4,
        questionKey: "disclosure_purpose",
        label: "Purpose of Disclosure",
        inputType: QuestionInputType.TEXTAREA,
        description: "e.g. evaluating a potential commercial partnership.",
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 5,
        questionKey: "term_years",
        label: "Confidentiality Period (years)",
        inputType: QuestionInputType.NUMBER,
        options: { min: 1, max: 10 },
        isRequired: true,
        complexityLevel: ComplexityLevel.BASIC,
      },
      {
        order: 20,
        questionKey: "exclusions",
        label: "Exclusions from Confidential Information",
        inputType: QuestionInputType.TEXTAREA,
        isRequired: false,
        complexityLevel: ComplexityLevel.STANDARD,
      },
    ],
  },

  // ...copy this pattern for the rest of your TYPES
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function run() {
  await AppDataSource.initialize();
  const typeRepo = AppDataSource.getRepository(ContractType);
  const questionRepo = AppDataSource.getRepository(ContractQuestionTemplate);

  console.log("Seeding contract types + questions...");

  for (const t of TYPES) {
    const slug = slugify(t.name);

    let ct = await typeRepo.findOne({ where: { slug }, relations: ["questionTemplates"] });

    if (!ct) {
      ct = typeRepo.create({
        name: t.name,
        slug,
        category: t.category,
        complexityLevel: t.complexity,
        jurisdictionDefault: t.jurisdictionDefault ?? "AU",
        isActive: true,
        primaryFormKeys: t.primaryFormKeys ?? null,
      });
      ct = await typeRepo.save(ct);
      console.log(`Inserted contract type: ${t.name}`);
    } else {
      // update primaryFormKeys if needed
      ct.primaryFormKeys = t.primaryFormKeys ?? ct.primaryFormKeys ?? null;
      await typeRepo.save(ct);
      console.log(`Updated contract type: ${t.name}`);
    }

    if (t.questions && t.questions.length > 0) {
      for (const q of t.questions) {
        const existing = await questionRepo.findOne({
          where: { contractType: { id: ct.id }, questionKey: q.questionKey },
        });
        if (existing) {
          continue;
        }
        const qt = questionRepo.create({
          contractType: ct,
          order: q.order,
          questionKey: q.questionKey,
          label: q.label,
          description: q.description ?? undefined,
          inputType: q.inputType ?? QuestionInputType.TEXT,
          options: q.options ?? undefined,
          isRequired: q.isRequired ?? true,
          complexityLevel: q.complexityLevel ?? ComplexityLevel.STANDARD,
        });
        await questionRepo.save(qt);
      }
    }
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
