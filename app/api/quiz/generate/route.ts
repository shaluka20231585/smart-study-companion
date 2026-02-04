import { NextResponse } from "next/server"
import { generateQuizQuestions } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const { content, count = 10, documentName = "document" } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Validate content has sufficient length for meaningful questions
    if (content.length < 500) {
      console.error("Content too short:", content.length, "characters")
      console.error("Content preview:", content.substring(0, 200))
      return NextResponse.json(
        { error: "Document content is too short to generate meaningful questions. Please ensure the document has been properly extracted." },
        { status: 400 }
      )
    }

    console.log(`Generating ${count} questions for "${documentName}"`)
    console.log(`Content length: ${content.length} characters`)
    console.log(`Content preview (first 300 chars):`, content.substring(0, 300))
    
    const questions = await generateQuizQuestions(content, count)

    // Validate generated questions
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate questions. Please try again." },
        { status: 500 }
      )
    }

    console.log(`Successfully generated ${questions.length} questions`)
    console.log(`Sample question:`, questions[0]?.question)

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quiz questions" },
      { status: 500 }
    )
  }
}
