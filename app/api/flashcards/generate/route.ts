import { NextResponse } from "next/server"
import { generateFlashcards } from "@/lib/ai"

export async function POST(request: Request) {
  try {
    const { content, count = 10 } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const flashcards = await generateFlashcards(content, count)

    return NextResponse.json({ flashcards })
  } catch (error) {
    console.error("Error generating flashcards:", error)
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    )
  }
}
