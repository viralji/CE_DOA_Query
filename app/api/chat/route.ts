import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getChatChain, queryChain } from "@/lib/chat-chain";

export async function POST(req: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // In development, allow bypass if dev-bypass-auth cookie is set
    if (!session || !session.user) {
      if (isDevelopment) {
        const devBypass = req.cookies.get('dev-bypass-auth')?.value === 'true';
        if (!devBypass) {
          return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }
        // Continue with dev bypass
      } else {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const body = await req.json();
    const { question, chatHistory } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // Input validation: limit question length
    const MAX_QUESTION_LENGTH = 1000;
    if (question.length > MAX_QUESTION_LENGTH) {
      return NextResponse.json(
        { error: `Question too long. Maximum length is ${MAX_QUESTION_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // Get chat chain
    const chain = await getChatChain();

    // Query the chain
    const result = await queryChain(question.trim(), chain);

    // Extract answer and source documents
    const answer = result.text || "I couldn't generate a response.";
    const sourceDocuments = result.sourceDocuments || [];

    // Format sources for frontend
    const sources = sourceDocuments.map((doc: any) => {
      const metadata = doc.metadata || {};
      return {
        rowNumber: metadata.rowNumber || null,
        category: metadata.category || null,
        no: metadata.no || null,
        limits: metadata.limits || null,
        shareholderApproval: metadata.shareholderApproval || null,
        boardApproval: metadata.boardApproval || null,
        ceo: metadata.ceo || null,
        content: doc.pageContent?.substring(0, 500) || "", // Preview of content
      };
    });

    return NextResponse.json({
      response: answer,
      sources: sources,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while processing your question" },
      { status: 500 }
    );
  }
}
