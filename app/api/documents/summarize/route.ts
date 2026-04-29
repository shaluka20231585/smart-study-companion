/**
 * AI Document Summarizer API Route
 * 
 * Generates a concise summary of a document's full text content.
 * Uses OpenAI GPT-4o-mini for fast responses.
 */

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

/**
 * Serverless function timeout (seconds)
 */
export const maxDuration = 60

/**
 * POST Handler - Generates AI summary of document content
 * 
 * @param req - HTTP Request containing:
 *   - documentContent: Full extracted text to summarize
 *   - documentName: Optional document name for context
 * 
 * @returns JSON response with the generated summary
 */
export async function POST(req: Request) {
  const { documentContent, documentName }: { documentContent: string; documentName?: string } =
    await req.json()

  // Validate input
  if (!documentContent || documentContent.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "Document content is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    /**
     * System prompt for the summarizer
     * Instructs the AI to create a focused, educational summary
     */
    const systemPrompt = `You are an expert at creating concise, focused summaries of academic and study materials.

Your task is to summarize the provided document in a clear, structured way:
- Start with a brief 1-2 sentence overview of the main topic
- List the key concepts or main points (3-5 bullet points)
- Provide a brief conclusion summarizing why this content matters

Use clear, simple language suitable for students at all levels.
Format the summary with clear sections and bullet points for readability.`

    /**
     * Generate summary using OpenAI GPT-4o-mini
     * Uses generateText for reliable, non-streaming response
     */
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: `Please summarize the following ${documentName ? `document titled "${documentName}"` : "document"}:\n\n${documentContent.slice(0, 50000)}`,
      temperature: 0.7,
    })

    /**
     * Return the generated summary as JSON
     */
    return new Response(
      JSON.stringify({ summary: result.text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("[SUMMARIZE] Error generating summary:", error)
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate summary", 
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
