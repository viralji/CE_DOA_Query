import { Embeddings } from "@langchain/core/embeddings";

const V1BETA_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Embeddings using Google's v1beta API (text-embedding-004, etc.).
 * The older @google/generative-ai SDK uses v1 which no longer supports embedding models.
 */
export class GoogleEmbeddingsV1Beta extends Embeddings {
  private apiKey: string;
  private model: string;

  constructor(params: { apiKey: string; modelName?: string }) {
    super({});
    this.apiKey = params.apiKey;
    this.model = params.modelName?.replace(/^models\//, "") ?? "text-embedding-004";
  }

  private async embedOne(text: string): Promise<number[]> {
    const url = `${V1BETA_BASE}/models/${this.model}:embedContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: text.replace(/\n/g, " ") }] },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google embedding API error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values ?? [];
  }

  async embedQuery(document: string): Promise<number[]> {
    return this.embedOne(document);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    // v1beta batch endpoint - each request must include model
    const url = `${V1BETA_BASE}/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
    const modelName = this.model.startsWith("models/") ? this.model : `models/${this.model}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: documents.map((text) => ({
          model: modelName,
          content: { parts: [{ text: text.replace(/\n/g, " ") }] },
        })),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google batch embedding API error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as { embeddings?: Array<{ values?: number[] }> };
    return (data.embeddings ?? []).map((e) => e.values ?? []);
  }
}
