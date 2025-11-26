export interface User {
  id: string;
  email: string;
  full_name: string;
  company_name?: string;
  jurisdiction?: string;
  subscription_tier: 'free' | 'pro';
  onboarding_complete: boolean;
  selected_categories?: string[];
}

export interface ContractType {
  id: string;
  name: string;
  category: string;
  complexity_level: 'simple' | 'moderate' | 'complex';
  question_count: number;
}

export type ContractStatus = 'in_progress' | 'ready_for_review' | 'finalized';

export interface ContractDraft {
  id: string;
  user_id: string;
  title: string;
  contract_type_id: string;
  contract_type_name: string;
  questionnaire_state: Record<string, any>;
  ai_draft_text: string;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  contract_draft_id: string;
  sender: 'user' | 'assistant';
  message: string;
  created_at: string;
}
