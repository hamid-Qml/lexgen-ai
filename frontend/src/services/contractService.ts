import { api } from "./api";

export type CreateDraftPayload = {
  contractTypeId?: string;
  contractTypeSlug?: string;
  title?: string;
  jurisdiction?: string;
};

export const contractService = {
  // GET /contracts (list recent)
  async listMyDrafts(limit = 10) {
    return api(`/contracts?limit=${limit}`, { method: "GET" });
  },

  // POST /contracts (create new draft)
  async createDraft(payload: CreateDraftPayload) {
    return api("/contracts", {
      method: "POST",
      body: payload,
    });
  },

  // GET /contracts/:id (full draft with messages)
  async getDraft(id: string) {
    return api(`/contracts/${id}`, { method: "GET" });
  },

  // POST /contracts/:id/messages
  async addMessage(id: string, body: { sender: "user" | "assistant"; message: string }) {
    return api(`/contracts/${id}/messages`, {
      method: "POST",
      body,
    });
  },
};
