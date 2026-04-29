// ============================================================================
// AI INTEGRATION LIBRARY
// ============================================================================
// This file contains all AI-powered features using OpenAI GPT-4o-mini.
// 
// Features implemented:
// 1. Flashcard Generation - Creates question/answer pairs from content
// 2. Quiz Generation - Generates multiple-choice questions with explanations
// 3. Document Summarization - Creates structured study summaries
// 4. Chat - Enables conversation with document content
//
// Technology Stack:
// - Vercel AI SDK: Provides unified interface for AI models
// - OpenAI GPT-4o-mini: Cost-effective model with good performance
// - Zod: Schema validation for structured outputs
//
// Key Concepts:
// - Prompt Engineering: Carefully crafted prompts ensure quality outputs
// - Structured Output: Using Zod schemas guarantees consistent data format
// - Content Validation: Prevents errors with insufficient content
// ============================================================================

import { generateText, generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"

// ============================================================================
// AI Configuration
// ============================================================================
// Using GPT-4o-mini for all AI operations
// Why GPT-4o-mini?
// - Cost-effective: ~10x cheaper than GPT-4
// - Fast: Lower latency for better UX
// - Sufficient capability: Handles educational content well
// - Same context window: 128k tokens (plenty for documents)
const model = openai("gpt-4o-mini")

// ============================================================================
// Content Validation
// ============================================================================
/**
 * Validates document content before AI processing
 * Prevents errors from empty, scanned, or image-based PDFs
 * 
 * @param content - The document text to validate
 * @param minWords - Minimum number of readable words required (default: 50)
 * @throws Error if content is insufficient or unreadable
 */
function validateContent(content: string, minWords: number = 50): void {
  // Check 1: Minimum character length (200 chars = ~30-40 words)
  if (!content || content.length < 200) {
    throw new Error("Document content is too short. Please ensure the document was extracted correctly.")
  }

  // Check 2: Count actual readable words (2+ letters)
  // This catches image-based PDFs that might have gibberish characters
  const words = content.match(/\b[a-zA-Z]{2,}\b/g) || []
  if (words.length < minWords) {
    throw new Error("Document has insufficient readable content. It may be scanned or image-based.")
  }
}

// ============================================================================
// Flashcard Generation
// ============================================================================
/**
 * Generates study flashcards from document content using AI
 * 
 * Features:
 * - Mixed difficulty levels (easy/medium/hard)
 * - Multiple question types (definitions, concepts, applications)
 * - Quality control through prompt engineering
 * - Covers all major topics (not just first section)
 * 
 * @param content - Document text to generate flashcards from
 * @param count - Number of flashcards to generate (default: 10)
 * @returns Array of flashcard objects with front, back, and difficulty
 */
export async function generateFlashcards(content: string, count: number = 10) {
  // Validate content before processing
  validateContent(content)

  // ============================================================================
  // STRUCTURED OUTPUT WITH ZOD SCHEMA
  // ============================================================================
  // Using generateObject instead of generateText ensures consistent format
  // Zod schema acts as a contract - AI must return exactly this structure
  const { object } = await generateObject({
    model,
    // Zod schema defines the expected output structure
    schema: z.object({
      flashcards: z.array(
        z.object({
          front: z.string().describe("Question or term to memorize"),
          back: z.string().describe("Answer or definition"),
          difficulty: z.enum(["easy", "medium", "hard"]),
        })
      ),
    }),
    // ============================================================================
    // PROMPT ENGINEERING FOR QUALITY FLASHCARDS
    // ============================================================================
    // This prompt uses several techniques:
    // 1. Role definition: "expert educator"
    // 2. Explicit types: Defines 5 flashcard categories
    // 3. Quality rules: Specific constraints for front/back
    // 4. Distribution: Mix of difficulties
    // 5. Examples: Shows desired format
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
/**
 * Generates multiple-choice quiz questions based on Bloom's Taxonomy
 * 
 * Bloom's Taxonomy Levels Implemented:
 * - Recall (30%): Remember facts, definitions, numbers
 * - Understanding (40%): Comprehend concepts and relationships
 * - Application (30%): Apply knowledge to scenarios
 * 
 * Each question includes:
 * - Clear question text
 * - 4 plausible answer options
 * - Index of correct answer (0-3)
 * - Explanation of why answer is correct
 * 
 * @param content - Document text to generate questions from
 * @param count - Number of questions to generate (default: 10)
 * @returns Array of quiz question objects
 */
export async function generateQuizQuestions(content: string, count: number = 10) {
  // Validate content quality
  validateContent(content)

  // Debug logging for troubleshooting
  console.log("[AI] Generating quiz questions...")
  console.log("[AI]   Content length:", content.length)

  // ============================================================================
  // STRUCTURED QUIZ GENERATION
  // ============================================================================
  const { object } = await generateObject({
    model,
    // Zod schema ensures each question has required fields
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
    // ============================================================================
    // ADVANCED PROMPT ENGINEERING
    // ============================================================================
    // This prompt implements educational best practices:
    // 1. Bloom's Taxonomy distribution
    // 2. Answer quality guidelines (plausible distractors)
    // 3. Specificity requirements
    // 4. Educational value focus
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

/**
 * summarizeContent — Generates a Markdown-formatted study summary
 * Uses generateText (not generateObject) because the output is free-form prose
 * @param content — Extracted document text to summarize
 */
export async function summarizeContent(content: string) {
  // Lower minimum word threshold (30) since even short documents can be summarised
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
${content.slice(0, 25000)}`,  // Cap at 25 000 chars to stay within token limits
  })

  return text  // Raw Markdown string rendered by the calling component
}

// ============================================================================
// Chat with Document
// ============================================================================

/**
 * chatWithDocument — Answers a user's question in the context of a document
 * Uses a system prompt to keep responses focused on the document content
 * @param content     — The extracted document text injected into the system prompt
 * @param userMessage — The latest user question
 * @param chatHistory — Prior turns so the model understands conversation context
 */
export async function chatWithDocument(
  content: string,
  userMessage: string,
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>
) {
  const { text } = await generateText({
    model,
    // System prompt defines the AI's persona and what it should/shouldn't answer
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
${content.slice(0, 20000)}`,  // Include up to 20 000 chars of document text
    messages: [
      // Spread prior turns so the model has full conversation context
      ...chatHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      // Append the new user message as the final turn
      { role: "user" as const, content: userMessage },
    ],
  })

  return text  // Plain text reply rendered in the chat UI
}

// ============================================================================
// Topic Extraction (Internal Use)
// ============================================================================

/**
 * extractKeyTopics — Identifies the main subjects covered in a document
 * Used internally for context enrichment (not directly exposed to the UI)
 * Returns structured objects with name, description, and relative importance
 */
export async function extractKeyTopics(content: string) {
  const { object } = await generateObject({
    model,
    // Zod schema: array of topic objects each with name + description + importance tier
    schema: z.object({
      topics: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          importance: z.enum(["high", "medium", "low"]),  // Tier based on document emphasis
        })
      ),
    }),
    prompt: `Identify the main topics in this document.

For each topic:
- Name: Short title (2-4 words)
- Description: What it covers (1 sentence)
- Importance: high/medium/low based on how much the document emphasizes it

DOCUMENT:
${content.slice(0, 15000)}`,  // Smaller cap — topic extraction needs less context
  })

  return object.topics  // Array of { name, description, importance }
}
