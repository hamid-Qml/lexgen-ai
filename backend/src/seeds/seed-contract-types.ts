import { DataSource } from "typeorm";
import { ContractType } from "../contract-catalog/entities/contract-type.entity";
import { ContractCategory, ComplexityLevel } from "src/contract-catalog/entities/contract.enums";
import { AppDataSource } from "../data-source";

const TYPES: Array<{
  name: string;
  category: ContractCategory;
  complexity: ComplexityLevel;
}> = [
  // --- COMMERCIAL ---
  { name: "Service Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.STANDARD },
  { name: "Consulting Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.STANDARD },
  { name: "Non-Disclosure Agreement (Mutual)", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.BASIC },
  { name: "Non-Disclosure Agreement (One-Way)", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.BASIC },
  { name: "Sales Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.STANDARD },
  { name: "Distribution Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },
  { name: "Partnership Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },
  { name: "Loan Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.STANDARD },
  { name: "Shareholders Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },
  { name: "Joint Venture Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },
  { name: "Procurement Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },

  // --- EMPLOYMENT ---
  { name: "Employment Agreement (Full-Time)", category: ContractCategory.EMPLOYMENT, complexity: ComplexityLevel.STANDARD },
  { name: "Employment Agreement (Part-Time)", category: ContractCategory.EMPLOYMENT, complexity: ComplexityLevel.STANDARD },
  { name: "Employment Agreement (Casual)", category: ContractCategory.EMPLOYMENT, complexity: ComplexityLevel.STANDARD },
  { name: "Contractor Agreement", category: ContractCategory.EMPLOYMENT, complexity: ComplexityLevel.STANDARD },
  { name: "Internship Agreement", category: ContractCategory.EMPLOYMENT, complexity: ComplexityLevel.BASIC },
  { name: "Confidentiality Agreement", category: ContractCategory.EMPLOYMENT, complexity: ComplexityLevel.BASIC },
  { name: "Non-Compete Agreement", category: ContractCategory.EMPLOYMENT, complexity: ComplexityLevel.COMPLEX },

  // --- TECHNOLOGY ---
  { name: "SaaS Agreement", category: ContractCategory.TECHNOLOGY, complexity: ComplexityLevel.COMPLEX },
  { name: "Software Licence Agreement", category: ContractCategory.TECHNOLOGY, complexity: ComplexityLevel.COMPLEX },
  { name: "Website Development Agreement", category: ContractCategory.TECHNOLOGY, complexity: ComplexityLevel.STANDARD },
  { name: "App Development Agreement", category: ContractCategory.TECHNOLOGY, complexity: ComplexityLevel.STANDARD },
  { name: "Maintenance & Support Agreement", category: ContractCategory.TECHNOLOGY, complexity: ComplexityLevel.STANDARD },
  { name: "Data Processing Agreement (DPA)", category: ContractCategory.TECHNOLOGY, complexity: ComplexityLevel.COMPLEX },
  { name: "Service Level Agreement (SLA)", category: ContractCategory.TECHNOLOGY, complexity: ComplexityLevel.STANDARD },

  // --- FAMILY LAW ---
  { name: "Consent Orders", category: ContractCategory.FAMILY_LAW, complexity: ComplexityLevel.COMPLEX },
  { name: "Parenting Plan", category: ContractCategory.FAMILY_LAW, complexity: ComplexityLevel.COMPLEX },
  { name: "Financial Agreement (Binding Financial Agreement)", category: ContractCategory.FAMILY_LAW, complexity: ComplexityLevel.COMPLEX },

  // --- GOVERNANCE ---
  { name: "Founders Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },
  { name: "Share Subscription Agreement", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },
  { name: "Company Constitution / Replaceable Rules", category: ContractCategory.COMMERCIAL, complexity: ComplexityLevel.COMPLEX },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function run() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(ContractType);

  console.log("Seeding contract types...");

  for (const t of TYPES) {
    const slug = slugify(t.name);

    const exists = await repo.findOne({ where: { slug } });
    if (exists) {
      console.log(`Skipping existing: ${t.name}`);
      continue;
    }

    const ct = repo.create({
      name: t.name,
      slug,
      category: t.category,
      complexityLevel: t.complexity,
      jurisdictionDefault: "AU",
      isActive: true,
    });

    await repo.save(ct);
    console.log(`Inserted: ${t.name}`);
  }

  console.log("Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
