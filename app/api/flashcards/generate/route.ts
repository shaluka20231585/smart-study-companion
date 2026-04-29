/**
 * Flashcard Generation API Route  POST /api/flashcards/generate
 *
 * Receives document text from the client and returns AI-generated flashcards.
 * Calls the generateFlashcards() function from lib/ai.ts which uses GPT-4o-mini.
 */

// NextResponse: Helper to build HTTP responses with correct status codes and JSON bodies
import { NextResponse } from "next/server"

// generateFlashcards: AI function that creates Q&A pairs from document content
import { generateFlashcards } from "@/lib/ai"

// POST handler — Next.js App Router matches POST /api/flashcards/generate to this function
export async function POST(request: Request) {
  try {
    // Parse the JSON body sent by the client
    // `content`: the extracted text from the document
    // `count`: how many flashcards to generate (defaults to 10 if not provided)
    const { content, count = 10 } = await request.json()

    // Validate that content was provided — can't generate cards from nothing
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
      // HTTP 400 Bad Request — the client sent an incomplete request
    }

    // Call the AI to generate flashcards from the document text
    // This sends the content + a prompt to GPT-4o-mini and parses the structured response
    const flashcards = await generateFlashcards(content, count)

    // Return the generated flashcards as a JSON response with HTTP 200 OK
    return NextResponse.json({ flashcards })
  } catch (error) {
    // Log the full error server-side for debugging (visible in Vercel logs)
    console.error("Error generating flashcards:", error)

    // Return a generic 500 error to the client — don't expose internal details
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 } // HTTP 500 Internal Server Error
    )
  }
}
