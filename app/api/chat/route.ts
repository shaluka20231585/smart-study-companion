/**
 * AI Chat API Route
 * 
 * This route handles real-time chat interactions between students and the AI tutor.
 * It uses OpenAI's GPT-4o-mini model with streaming responses for immediate feedback.
 * Supports both document-specific chat (RAG) and general study assistance.
 */

// Import required functions from Vercel AI SDK
import { consumeStream, convertToModelMessages, streamText, type UIMessage } from "ai"
// Import OpenAI provider configuration
import { openai } from "@ai-sdk/openai"

/**
 * Maximum execution time for this serverless function (in seconds)
 * Prevents timeouts during long conversations or slow AI responses
 */
export const maxDuration = 30

/**
 * POST Handler - Processes chat messages and returns streaming AI responses
 * 
 * @param req - HTTP Request containing:
 *   - messages: Array of conversation history (user and AI messages)
 *   - documentContent: Optional PDF text content for context-aware responses (RAG)
 * 
 * @returns Stream of AI-generated text chunks (Server-Sent Events)
 */
export async function POST(req: Request) {
  // Parse incoming request body to extract chat messages and optional document context
  const { messages, documentContent }: { messages: UIMessage[]; documentContent?: string } =
    await req.json()

  // Debug logging
  console.log("[CHAT API] Received request:")
  console.log("[CHAT API] Has documentContent:", !!documentContent)
  console.log("[CHAT API] documentContent length:", documentContent?.length || 0)
  console.log("[CHAT API] Messages count:", messages.length)

  /**
   * System Prompt - Instructions that define the AI's behavior and personality
   * 
   * Two modes:
   * 1. Document-Specific Mode (RAG): AI answers based on provided PDF content
   * 2. General Study Mode: AI provides general learning assistance
   */
  const systemPrompt = documentContent
    ? // RAG Mode: Document content is available
      `You are a helpful AI study tutor. You have access to the following document content and should answer questions based on it.
If the question is not related to the document content, politely guide the user back to the study material.
Be encouraging and supportive in your responses.
When explaining concepts, use simple language and provide examples when helpful.
Format your responses with clear paragraphs and use bullet points when listing items.

Document Content:
${documentContent.slice(0, 25000)}`
    : // General Mode: No document context provided
      `You are a helpful AI study tutor. Help students with their learning questions.
Be encouraging and supportive in your responses.
When explaining concepts, use simple language and provide examples when helpful.
If students don't have a specific document loaded, offer general study tips and help them understand concepts.`

  // Log which mode is being used
  console.log("[CHAT API] System Prompt Mode:", documentContent ? "RAG (with document)" : "GENERAL (no document)")
  if (documentContent) {
    console.log("[CHAT API] Document content will be injected (truncated at 25,000 chars)")
    console.log("[CHAT API] Document preview:", documentContent.slice(0, 200))
  }

  /**
   * Generate streaming AI response using OpenAI GPT-4o-mini
   * 
   * Key features:
   * - model: GPT-4o-mini (cost-effective, fast, good for educational content)
   * - system: The behavior-defining prompt (context + instructions)
   * - messages: Full conversation history converted to OpenAI format
   * - abortSignal: Allows cancellation if user navigates away or closes chat
   */
  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  /**
   * Convert the AI stream to a format suitable for the UI
   * 
   * Returns Server-Sent Events (SSE) stream that the frontend can consume
   * in real-time, displaying text as it's generated (word-by-word effect)
   * 
   * - originalMessages: Preserved for client-side state management
   * - consumeSseStream: Handles the low-level streaming protocol
   */
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
