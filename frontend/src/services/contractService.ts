// src/services/contractService.ts
import { api } from "./api";

export type CreateDraftPayload = {
  contractTypeId?: string;
  contractTypeSlug?: string;
  title?: string;
  jurisdiction?: string;
};

export const contractService = {
  async listMyDrafts(limit = 10) {
    return api(`/contracts?limit=${limit}`, { method: "GET" });
  },

  async createDraft(payload: CreateDraftPayload) {
    return api("/contracts", {
      method: "POST",
      body: payload,
    });
  },

  async getDraft(id: string) {
    return api(`/contracts/${id}`, { method: "GET" });
  },

  async addMessage(id: string, body: { sender: "user" | "assistant"; message: string }) {
    return api(`/contracts/${id}/messages`, {
      method: "POST",
      body,
    });
  },

  // start the AI conversation (initial assistant message)
  async startChat(id: string, body?: { answers?: Record<string, any> }) {
    return api(`/contracts/${id}/start`, {
      method: "POST",
      body,
    });
  },

  // generate contract via backend + mlend
  async generateContract(id: string, body: { answers: Record<string, any> }) {
    return api(`/contracts/${id}/generate`, {
      method: "POST",
      body,
    });
  },
};
