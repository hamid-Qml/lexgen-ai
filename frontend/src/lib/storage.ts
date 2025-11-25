// src/lib/storage.ts
import { User, ContractDraft, ChatMessage, ContractType } from "@/types";
import { STORAGE } from "@/services/api";

/**
 * NOTE:
 * - User auth & profile are now driven by the real backend + authService.
 * - This file only provides thin helpers around localStorage for the
 *   currently logged-in user, plus some legacy no-op helpers for drafts/messages.
 */

const STORAGE_KEYS = {
  // We now rely on STORAGE.USER for the current user
  // These are kept only for legacy draft/chat storage if ever needed again.
  CONTRACT_DRAFTS: "lexy_contract_drafts",
  CHAT_MESSAGES: "lexy_chat_messages",
};

// ---------------------------------------------------------------------------
// User Management – backed by STORAGE.USER from src/services/api.ts
// ---------------------------------------------------------------------------

export const getCurrentUser = (): User | null => {
  try {
    const userJson = localStorage.getItem(STORAGE.USER);
    return userJson ? (JSON.parse(userJson) as User) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE.USER);
  }
};

// Legacy helpers – kept for compatibility, but no longer used in the new flow.
// We treat the single stored user as "the only user" in this browser.

export const getAllUsers = (): User[] => {
  const u = getCurrentUser();
  return u ? [u] : [];
};

export const saveUser = (user: User) => {
  // In the new architecture, users are created via the backend /auth/signup.
  // This just mirrors the current user into localStorage for UI convenience.
  setCurrentUser(user);
};

export const findUserByEmail = (email: string): User | undefined => {
  const u = getCurrentUser();
  if (!u) return undefined;
  return u.email.toLowerCase() === email.toLowerCase() ? u : undefined;
};

// ---------------------------------------------------------------------------
// Contract Drafts – now handled by backend (/contracts)
// These helpers are kept as NO-OP / empty for compatibility only.
// ---------------------------------------------------------------------------

export const getContractDrafts = (_userId: string): ContractDraft[] => {
  // Drafts now come from the backend via contractService.listMyDrafts()
  return [];
};

export const getContractDraft = (_id: string): ContractDraft | null => {
  // Drafts now come from the backend via contractService.getDraft()
  return null;
};

export const saveContractDraft = (_draft: ContractDraft) => {
  // No-op: draft creation & updates are persisted on the server.
};

export const seedSampleDrafts = (_userId: string) => {
  // No-op: sample drafts are no longer seeded locally.
};

// ---------------------------------------------------------------------------
// Chat Messages – now handled by backend (/contracts/:id/messages)
// ---------------------------------------------------------------------------

export const getChatMessages = (_contractDraftId: string): ChatMessage[] => {
  // Messages now come from the backend via contractService.getDraft()
  return [];
};

export const saveChatMessage = (_message: ChatMessage) => {
  // No-op: messages are persisted on the server.
};
