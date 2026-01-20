import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getVectorStore } from "./vectorstore";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import type { BaseRetriever } from "langchain/schema/retriever";

interface ChatChain {
  llm: ChatGoogleGenerativeAI;
  retriever: BaseRetriever;
  chatHistory: Array<HumanMessage | AIMessage>;
}

let chatChain: ChatChain | null = null;

export async function getChatChain(): Promise<ChatChain> {
  if (chatChain) {
    return chatChain;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is not set");
  }

  // Initialize LLM
  const llm = new ChatGoogleGenerativeAI({
    modelName: "models/gemini-2.5-pro",
    temperature: 0,
    apiKey: apiKey,
  });

  // Get vector store
  const vectorStore = await getVectorStore();
  const retriever = vectorStore.asRetriever({
    k: 8, // Retrieve top 8 most relevant documents to ensure comprehensive coverage
  });

  chatChain = {
    llm,
    retriever,
    chatHistory: [],
  };

  return chatChain;
}

export async function queryChain(
  question: string,
  chain: ChatChain
): Promise<{ text: string; sourceDocuments: any[] }> {
  // Retrieve relevant documents
  const docs = await chain.retriever.invoke(question);

  // Build context from retrieved documents
  const context = docs
    .map((doc: any, idx: number) => {
      const metadata = doc.metadata || {};
      return `[Source ${idx + 1} - Row ${metadata.rowNumber || "N/A"}]
Category: ${metadata.category || "N/A"}
${doc.pageContent}`;
    })
    .join("\n\n");

  // Build prompt with context and chat history
  const chatHistoryText = chain.chatHistory
    .map((msg) => {
      if (msg instanceof HumanMessage) {
        return `Human: ${msg.content}`;
      } else if (msg instanceof AIMessage) {
        return `Assistant: ${msg.content}`;
      }
      return "";
    })
    .join("\n");

  const systemPrompt = `You are a helpful assistant that answers questions about Delegation of Authority (DOA) policies and approval processes. 
Provide clear, concise, and natural-sounding answers.

IMPORTANT - Approval Code Legend:
- R = Responsible (person responsible for executing)
- A = Approver (person who must approve)  
- I = To be Informed (person who should be kept informed)
- Numbers indicate levels (A1 = Approver level 1, A2 = Approver level 2, etc.)

Response Guidelines:
1. Start with a direct answer to the question
2. Include ALL relevant information from the context - if there are multiple scenarios (e.g., different amounts, different processes), mention ALL of them
3. Explain approval codes naturally when first mentioned (e.g., "requires CEO approval (A1)" or "Board must be informed (I)")
4. Use clear, simple language - avoid jargon and repetition
5. DO NOT use any markdown formatting - no asterisks (*), no bold (**), no bullet points (*), just plain text with line breaks
6. When listing multiple scenarios, use clear labels like "For [condition]:" followed by the process on the next line
7. Use simple line breaks to separate sections - double line break between scenarios
8. Keep explanations brief - don't over-explain the legend
9. End with: "Source: Row X" or "Sources: Rows X, Y" - include all relevant row numbers

Example good response format (NO markdown):
"For disposal of fixed assets, the process depends on the value:

For disposals up to INR 5 million:
CEO approval (A1) is required. The Board (I) and Investment Committee must be informed.

For disposals over INR 5 million:
Investment Committee approval (A2) is required. The CEO (R1) is responsible for execution.

Sources: Rows 50, 51"

Context from DOA document:
${context}

${chatHistoryText ? `Previous conversation:\n${chatHistoryText}\n\n` : ""}
Human: ${question}
Assistant:`;

  // Get response from LLM
  const response = await chain.llm.invoke(systemPrompt);

  // Update chat history
  chain.chatHistory.push(new HumanMessage(question));
  chain.chatHistory.push(new AIMessage(response.content as string));

  // Keep only last 10 messages to avoid token limits
  if (chain.chatHistory.length > 10) {
    chain.chatHistory = chain.chatHistory.slice(-10);
  }

  return {
    text: response.content as string,
    sourceDocuments: docs,
  };
}

export function clearChatChain() {
  chatChain = null;
}
