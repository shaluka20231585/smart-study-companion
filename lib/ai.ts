import { generateText, generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

// ============================================================================
// AI Configuration
// ============================================================================

const model = openai("gpt-4o-mini")

// ============================================================================
// Content Validation
// ============================================================================

function validateContent(content: string, minWords: number = 50): void {
  if (!content || content.length < 200) {
    throw new Error("Document content is too short. Please ensure the document was extracted correctly.")
  }

  const words = content.match(/\b[a-zA-Z]{2,}\b/g) || []
  if (words.length < minWords) {
    throw new Error("Document has insufficient readable content. It may be scanned or image-based.")
  }
}

// ============================================================================
// Flashcard Generation
// ============================================================================

export async function generateFlashcards(content: string, count: number = 10) {
  validateContent(content)

  const { object } = await generateObject({
    model,
    schema: z.object({
      flashcards: z.array(
        z.object({
          front: z.string().describe("Question or term to memorize"),
          back: z.string().describe("Answer or definition"),
          difficulty: z.enum(["easy", "medium", "hard"]),
        })
      ),
    }),
    prompt: `You are an expert educator creating study flashcards. Generate ${count} high-quality flashcards from this document.

FLASHCARD TYPES TO CREATE:
1. DEFINITION CARDS (Easy): "What is [term]?" → Clear definition
2. CONCEPT CARDS (Medium): "How does [X] work?" → Explanation with key points
3. APPLICATION CARDS (Hard): "When would you use [X]?" → Practical scenarios
4. COMPARISON CARDS (Medium): "What's the difference between [X] and [Y]?"
5. FACT CARDS (Easy): Specific numbers, dates, names, formulas

QUALITY RULES:
- Front: One clear question (10-20 words max)
- Back: Complete answer (2-4 sentences, include examples when helpful)
- Use terminology from the document
- Cover ALL major topics, not just the first section
- Mix difficulty: 30% easy, 50% medium, 20% hard

DOCUMENT CONTENT:
${content.slice(0, 25000)}

Generate ${count} flashcards that would help a student master this material for an exam.`,
  })

  return object.flashcards
}

// ============================================================================
// Quiz Generation
// ============================================================================

export async function generateQuizQuestions(content: string, count: number = 10) {
  validateContent(content)

  console.log("[AI] Generating quiz questions...")
  console.log("[AI]   Content length:", content.length)

  const { object } = await generateObject({
    model,
    schema: z.object({
      questions: z.array(
        z.object({
          question: z.string().describe("Clear question testing document knowledge"),
          options: z.array(z.string()).length(4).describe("Four answer options A-D"),
          correctAnswer: z.number().min(0).max(3).describe("Index of correct answer (0-3)"),
          explanation: z.string().describe("Why this answer is correct"),
        })
      ),
    }),
    prompt: `You are creating an exam for students who studied this document. Generate ${count} questions.

QUESTION TYPES (mix these):
1. RECALL (30%): Test specific facts, definitions, numbers from the document
   Example: "According to the document, what is the value of X?"
   
2. UNDERSTANDING (40%): Test comprehension of concepts and relationships
   Example: "Why does the document state that X leads to Y?"
   
3. APPLICATION (30%): Test ability to apply knowledge to scenarios
   Example: "Based on the document, which approach would work best for Z?"

ANSWER OPTION RULES:
- Correct answer: Must be explicitly stated or directly implied in the document
- Wrong answers: Plausible but clearly incorrect if you read the document
- Include specific details (names, numbers, terms) to make options distinguishable
- Avoid "all of the above" or "none of the above"

QUESTION QUALITY:
- Be specific - reference actual content from the document
- Test understanding, not just word recognition
- Each question should have ONE clearly correct answer
- Wrong answers should be educational (common misconceptions)

DOCUMENT CONTENT:
${content.slice(0, 30000)}

Generate ${count} exam-quality questions that test real understanding of this material.`,
  })

  return object.questions
}

// ============================================================================
// Document Summarization
// ============================================================================

export async function summarizeContent(content: string) {
  validateContent(content, 30)

  const { text } = await generateText({
    model,
    prompt: `Create a comprehensive study summary of this document.

STRUCTURE YOUR SUMMARY AS:

## Overview
(2-3 sentences explaining what this document is about)

## Key Concepts
(Bullet points of the main ideas, each with a brief explanation)

## Important Details
(Specific facts, numbers, formulas, or examples worth remembering)

## How Things Connect
(Explain relationships between concepts)

## Quick Review Points
(5-7 bullet points for quick revision before an exam)

GUIDELINES:
- Use simple, clear language
- Highlight terminology that might appear on tests
- Include specific examples from the document
- Organize information logically
- Make it scannable with clear headers

DOCUMENT CONTENT:
${content.slice(0, 25000)}`,
  })

  return text
}

// ============================================================================
// Chat with Document
// ============================================================================

export async function chatWithDocument(
  content: string,
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>
) {
  const { text } = await generateText({
    model,
    system: `You are a friendly study tutor helping a student understand their document.

YOUR ROLE:
- Answer questions based on the document content
- Explain complex concepts in simple terms
- Give examples to illustrate points
- Be encouraging and supportive
- If asked about something not in the document, say so politely

RESPONSE STYLE:
- Keep answers concise but complete
- Use bullet points for lists
- Highlight key terms
- Offer to explain further if needed

DOCUMENT CONTENT:
${content.slice(0, 20000)}`,
    messages: [
      ...chatHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: userMessage },
    ],
  })

  return text
}

// ============================================================================
// Topic Extraction (Internal Use)
// ============================================================================

export async function extractKeyTopics(content: string) {
  const { object } = await generateObject({
    model,
    schema: z.object({
      topics: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          importance: z.enum(["high", "medium", "low"]),
        })
      ),
    }),
    prompt: `Identify the main topics in this document.

For each topic:
- Name: Short title (2-4 words)
- Description: What it covers (1 sentence)
- Importance: high/medium/low based on how much the document emphasizes it

DOCUMENT:
${content.slice(0, 15000)}`,
  })

  return object.topics
}
