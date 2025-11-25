// src/services/contractCatalogService.ts
import { api } from "./api";

// Shape coming from the backend (matches your Nest ContractType entity)
export type BackendContractType = {
  id: string;
  slug: string;
  name: string;
  category: "commercial" | "employment" | "technology" | "family_law" | string;
  description: string | null;
  complexityLevel: "basic" | "standard" | "complex";
  jurisdictionDefault: string;
  isActive: boolean;
};

// Shape used by the UI (what ContractSelector expects)
export type UiContractType = {
  id: string;
  name: string;
  category: string; // prettified label (Commercial, Employment, etc.)
  complexity_level: "simple" | "moderate" | "complex";
  question_count: number;
};

function mapCategoryLabel(category: string): string {
  switch (category) {
    case "commercial":
      return "Commercial";
    case "employment":
      return "Employment";
    case "technology":
      return "Technology";
    case "family_law":
      return "Family Law";
    default:
      // Fallback – title-case the string
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

function mapComplexityLevel(
  level: BackendContractType["complexityLevel"],
): UiContractType["complexity_level"] {
  switch (level) {
    case "basic":
      return "simple";
    case "standard":
      return "moderate";
    case "complex":
      return "complex";
    default:
      return "moderate";
  }
}

function estimateQuestionCount(
  level: BackendContractType["complexityLevel"],
): number {
  switch (level) {
    case "basic":
      return 8; // ~8–10 questions
    case "standard":
      return 15; // ~12–18 questions
    case "complex":
      return 25; // ~20–30 questions
    default:
      return 12;
  }
}

function mapToUi(contractType: BackendContractType): UiContractType {
  return {
    id: contractType.id,
    name: contractType.name,
    category: mapCategoryLabel(contractType.category),
    complexity_level: mapComplexityLevel(contractType.complexityLevel),
    question_count: estimateQuestionCount(contractType.complexityLevel),
  };
}

export const contractCatalogService = {
  async searchTypes(params?: {
    q?: string;
    category?: string; // backend enum (commercial/employment/...)
    limit?: number;
  }): Promise<UiContractType[]> {
    const qp = new URLSearchParams();

    if (params?.q) qp.set("q", params.q);
    if (params?.category && params.category !== "all") {
      qp.set("category", params.category);
    }
    if (params?.limit) qp.set("limit", String(params.limit));

    const qs = qp.toString();
    const path = qs ? `/contract-types?${qs}` : `/contract-types`;

    const raw = await api<BackendContractType[]>(path, { method: "GET" });
    return raw.map(mapToUi);
  },
};
