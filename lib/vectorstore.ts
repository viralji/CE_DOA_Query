import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import * as fs from "fs";
import * as path from "path";
import { DOAChunk } from "./process-excel";

const INDEX_DIR = path.join(process.cwd(), "data/faiss-index");
const EMBEDDINGS_FILE = path.join(INDEX_DIR, "embeddings.json");
const METADATA_FILE = path.join(INDEX_DIR, "metadata.json");

let vectorStore: MemoryVectorStore | null = null;
let embeddings: GoogleGenerativeAIEmbeddings | null = null;

export async function getEmbeddings(): Promise<GoogleGenerativeAIEmbeddings> {
  if (!embeddings) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not set");
    }
    embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: "models/embedding-001",
      apiKey: apiKey,
    });
  }
  return embeddings;
}

export async function buildVectorStore(chunks: DOAChunk[]): Promise<MemoryVectorStore> {
  const embeddingModel = await getEmbeddings();
  
  // Convert chunks to LangChain documents
  const documents = chunks.map((chunk) => {
    return new Document({
      pageContent: chunk.text,
      metadata: {
        rowNumber: chunk.metadata.rowNumber,
        category: chunk.metadata.category || "",
        no: chunk.metadata.no || "",
        limits: chunk.metadata.limits || "",
        shareholderApproval: chunk.metadata.shareholderApproval || "",
        boardApproval: chunk.metadata.boardApproval || "",
        ceo: chunk.metadata.ceo || "",
        remarks: chunk.metadata.remarks || "",
      },
    });
  });

  console.log(`Creating vector store with ${documents.length} documents...`);
  
  // Google API has a batch limit of 100, so we need to process in batches
  const BATCH_SIZE = 100;
  
  // Create vector store with first batch
  const firstBatch = documents.slice(0, Math.min(BATCH_SIZE, documents.length));
  console.log(`Processing batch 1/${Math.ceil(documents.length / BATCH_SIZE)} (${firstBatch.length} documents)...`);
  const store = await MemoryVectorStore.fromDocuments(firstBatch, embeddingModel);
  
  // Add remaining documents in batches
  for (let i = BATCH_SIZE; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`Processing batch ${batchNum + 1}/${Math.ceil(documents.length / BATCH_SIZE)} (${batch.length} documents)...`);
    
    // Add documents in this batch to the store
    await store.addDocuments(batch);
  }
  
  console.log("Vector store created successfully");
  return store;
}

export async function loadVectorStore(): Promise<MemoryVectorStore | null> {
  // For MemoryVectorStore, we need to rebuild from source data
  // In a production app, you'd use a persistent vector store like Pinecone or Weaviate
  // For now, we'll rebuild from processed chunks
  const chunksPath = path.join(process.cwd(), "data/processed/doa-chunks.json");
  
  if (!fs.existsSync(chunksPath)) {
    console.log("Processed chunks not found. Please run process-doa script first.");
    return null;
  }

  const chunksData = fs.readFileSync(chunksPath, "utf-8");
  const chunks: DOAChunk[] = JSON.parse(chunksData);
  
  return await buildVectorStore(chunks);
}

export async function getVectorStore(): Promise<MemoryVectorStore> {
  if (!vectorStore) {
    vectorStore = await loadVectorStore();
    if (!vectorStore) {
      throw new Error("Vector store not initialized. Please run the process-doa script first.");
    }
  }
  return vectorStore;
}

export function clearVectorStore() {
  vectorStore = null;
}
