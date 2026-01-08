// src/services/contractService.ts
import { api, getToken } from "./api";

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

  async addMessage(
    id: string,
    body: {
      sender: "user" | "assistant";
      message: string;
      answers?: Record<string, any>;
    },
  ) {
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

  async getGenerationProgress(id: string) {
    return api(`/contracts/${id}/progress`, { method: "GET" });
  },

  async downloadDraft(id: string, format: "pdf" | "docx" | "txt") {
    const token = getToken();
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/contracts/${id}/download?format=${format}`,
      {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      },
    );

    if (!res.ok) {
      const payload = await res.text().catch(() => null);
      throw new Error(payload || "Failed to download contract");
    }

    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition") || "";
    const filenameMatch = disposition.match(/filename="(.+?)"/i);
    const filename = filenameMatch?.[1] || `contract.${format}`;
    return { blob, filename };
  },
};
