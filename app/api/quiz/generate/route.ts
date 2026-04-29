/**
 * Quiz Generation API Route  POST /api/quiz/generate
 *
 * Receives document text from the client, validates it, and returns
 * AI-generated multiple-choice questions based on Bloom's Taxonomy.
 */

// NextResponse: Helper to build JSON HTTP responses with correct status codes
import { NextResponse } from "next/server"

// generateQuizQuestions: AI function that creates multiple-choice questions from document text
import { generateQuizQuestions } from "@/lib/ai"

// POST handler — Next.js App Router routes POST /api/quiz/generate here
export async function POST(request: Request) {
  try {
    // Destructure the JSON request body
    // `content`: extracted text of the document to quiz on
    // `count`: number of questions to generate (default: 10)
    // `documentName`: used only for logging to identify which document is being processed
    const { content, count = 10, documentName = "document" } = await request.json()

    // Guard: content is mandatory — can't generate questions with nothing
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Guard: content must be at least 500 characters to produce meaningful questions
    // Very short text produces low-quality or repeated questions
    if (content.length < 500) {
      console.error("Content too short:", content.length, "characters")
      console.error("Content preview:", content.substring(0, 200)) // Log a preview to diagnose the issue
      return NextResponse.json(
        { error: "Document content is too short to generate meaningful questions. Please ensure the document has been properly extracted." },
        { status: 400 } // HTTP 400 Bad Request — problem is with the client's input
      )
    }

    // Log useful diagnostics before calling the AI (visible in server/Vercel logs)
    console.log(`Generating ${count} questions for "${documentName}"`)
    console.log(`Content length: ${content.length} characters`)
    console.log(`Content preview (first 300 chars):`, content.substring(0, 300))
    
    // Call the AI to generate quiz questions using Bloom's Taxonomy prompt
    // Returns an array of { question, options, correctAnswer, explanation } objects
    const questions = await generateQuizQuestions(content, count)

    // Validate that the AI returned at least one question
    // (Could be empty if the model returned a malformed response)
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate questions. Please try again." },
        { status: 500 } // HTTP 500 — server-side AI failure
      )
    }

    // Log success details for monitoring
    console.log(`Successfully generated ${questions.length} questions`)
    console.log(`Sample question:`, questions[0]?.question)

    // Return the questions to the client as JSON with HTTP 200 OK
    return NextResponse.json({ questions })
  } catch (error) {
    // Log the full error for debugging
    console.error("Error generating quiz:", error)

    // Return the error message if it's an Error instance, otherwise a generic message
    // This preserves useful AI validation errors (e.g. "content too short")
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quiz questions" },
      { status: 500 }
    )
  }
}
