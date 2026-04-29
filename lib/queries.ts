// Import the shared Supabase client used for all database operations
import { supabase } from "@/lib/supabase"

// ============================================================
// DOCUMENTS
// ============================================================

/**
 * getDocuments — Fetch all documents belonging to a user
 * Returns them sorted newest-first for the documents list page
 */
export async function getDocuments(userId: string) {
  const { data, error } = await supabase
    .from("documents")           // Target the documents table
    .select("*")                  // Fetch every column
    .eq("user_id", userId)        // Filter: only this user's documents (RLS also enforces this)
    .order("created_at", { ascending: false }) // Newest first
  if (error) throw error          // Propagate to caller; callers display error toasts
  return data
}

/**
 * getDocumentById — Fetch a single document by its ID
 * Requires userId to prevent users from accessing other users' documents
 */
export async function getDocumentById(id: string, userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)                  // Match specific document ID
    .eq("user_id", userId)         // Double-check ownership (defence in depth alongside RLS)
    .single()                      // Returns one row; throws if zero or multiple rows found
  if (error) throw error
  return data
}

/**
 * getDocumentContent — Fetch the extracted text content record for a document
 * Stored in document_contents table (one row per document after PDF extraction)
 */
export async function getDocumentContent(documentId: string) {
  const { data, error } = await supabase
    .from("document_contents")
    .select("*")
    .eq("document_id", documentId) // Join condition — document_contents.document_id references documents.id
    .single()                      // Expect exactly one content record per document
  if (error) throw error
  return data
}

/**
 * getDocumentTextFromChunks — Reconstruct full document text from stored chunks
 * Used when AI needs the complete text (e.g. for chat context injection)
 * Chunks are ordered by chunk_index to preserve original document order
 */
export async function getDocumentTextFromChunks(documentId: string): Promise<string> {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("chunk_text")          // Only fetch the text column (not metadata)
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true }) // Restore original page/section order
  
  if (error) throw error
  if (!data || data.length === 0) return "" // Return empty string when no chunks stored yet
  
  // Join all chunk texts with newlines to reconstruct the full document text
  return data.map((chunk: any) => chunk.chunk_text).join("\n")
}

/**
 * updateDocument — Partial update for a document record
 * Used by the extraction pipeline to set status (processing → ready | error),
 * page count, and other metadata after PDF processing finishes
 */
export async function updateDocument(id: string, updates: any) {
  const { error } = await supabase
    .from("documents")
    .update(updates)               // Applies only the keys present in `updates`
    .eq("id", id)
  if (error) throw error
}

/**
 * deleteDocument — Permanently removes a document record from the database
 * Note: cascading deletes in the DB schema also remove related chunks, flashcards, and quizzes
 */
export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
  if (error) throw error
}

/**
 * createDocumentContent — Inserts the extracted text record after PDF processing
 * Called by the /api/documents/extract route once text extraction succeeds
 */
export async function createDocumentContent(documentId: string, content: any) {
  const { data, error } = await supabase
    .from("document_contents")
    .insert({
      document_id: documentId, // Foreign key linking content to its parent document
      ...content,              // Spread in the rest: { text, metadata, etc. }
    })
    .select()                  // Return the newly inserted row
  if (error) throw error
  return data
}

// ============================================================
// FLASHCARDS
// ============================================================

/**
 * getFlashcardDecks — Fetch all flashcard decks for a user, newest first
 */
export async function getFlashcardDecks(userId: string) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

/**
 * getFlashcardsByDeck — Fetch all individual flashcard cards within a deck
 */
export async function getFlashcardsByDeck(deckId: string) {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", deckId)         // Filter to cards belonging to this deck
  if (error) throw error
  return data
}

/**
 * getFlashcardDeckById — Fetch a single deck by ID with ownership check
 */
export async function getFlashcardDeckById(id: string, userId: string) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)         // Ownership guard
    .single()
  if (error) throw error
  return data
}

/**
 * deleteFlashcardDeck — Deletes a deck and all its cards (two-step delete)
 * The DB doesn't cascade on this relationship, so we manually delete cards first
 */
export async function deleteFlashcardDeck(id: string) {
  // Step 1: Delete all flashcard rows that belong to this deck
  const { error: flashcardsError } = await supabase
    .from("flashcards")
    .delete()
    .eq("deck_id", id)
  if (flashcardsError) throw flashcardsError // Stop here if cards couldn't be deleted

  // Step 2: Now safely delete the parent deck record
  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("id", id)
  if (error) throw error
}

/**
 * createFlashcardDeck — Insert a new deck record and return the created row
 */
export async function createFlashcardDeck(deckData: any) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .insert(deckData)
    .select()                      // Return the newly created row (includes auto-generated id)
  if (error) {
    console.error("Supabase error creating flashcard deck:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to create flashcard deck: ${error.message || "Unknown error"}`)
  }
  if (!data || data.length === 0) {
    throw new Error("Flashcard deck created but no data returned")
  }
  return data[0]                   // Unwrap from array — insert always returns an array
}

/**
 * createFlashcards — Bulk insert an array of flashcard objects into the flashcards table
 */
export async function createFlashcards(flashcards: any[]) {
  if (!flashcards || flashcards.length === 0) {
    throw new Error("No flashcards provided to save")
  }
  
  console.log(`Inserting ${flashcards.length} flashcards with fields:`, Object.keys(flashcards[0]))
  
  const { data, error } = await supabase
    .from("flashcards")
    .insert(flashcards)            // Supabase accepts an array for batch inserts
    .select()
  if (error) {
    console.error("Supabase error creating flashcards:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    throw new Error(`Failed to save flashcards: ${error.message || "Unknown error"}`)
  }
  return data
}

// ============================================================
// QUIZZES
// ============================================================

/**
 * getQuizzes — Fetch all quizzes for a user, newest first
 */
export async function getQuizzes(userId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

/**
 * getQuizById — Fetch a single quiz by ID with ownership check
 * Has extra diagnostic logging to help debug missing-quiz issues in production
 */
export async function getQuizById(id: string, userId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)         // Ownership guard
    .single()
  
  if (error) {
    // Log detailed error info to help diagnose 404/permission issues
    console.error("Error fetching quiz by ID:", {
      error: error.message,
      errorCode: error.code,
      quizId: id,
      userId: userId,
      details: error,
    })
    throw error
  }
  
  return data
}

/**
 * getQuizQuestions — Fetch all questions for a quiz, in display order
 * Also normalises the data: JSON-parses options if stored as a string,
 * and adds a `correctAnswer` alias for compatibility with display components
 */
export async function getQuizQuestions(quizId: string) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true }) // Respect the intended question order
  if (error) throw error
  
  // Transform each question row for the UI
  return data?.map((q: any) => ({
    id: q.id,
    quiz_id: q.quiz_id,
    question: q.question,
    // options may be stored as a JSON string — parse it if so
    options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
    correct_answer: q.correct_answer,
    correctAnswer: q.correct_answer, // Duplicate field for components that use camelCase
    explanation: q.explanation || "",
    order: q.order,
    created_at: q.created_at,
  })) || []
}

/**
 * createQuiz — Insert a new quiz record and return the created row
 * Has extra error logging to surface Supabase constraint violations
 */
export async function createQuiz(quizData: any) {
  const { data, error } = await supabase
    .from("quizzes")
    .insert(quizData)
    .select()
  if (error) {
    // Log the full Supabase error object for debugging DB constraint issues
    console.error("Supabase createQuiz error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      quizData
    })
    throw error
  }
  return data[0] // Unwrap array — insert always returns an array
}

/**
 * createQuizQuestions — Bulk insert quiz question rows
 * Includes detailed logging because question insertion is the most common failure point
 */
export async function createQuizQuestions(questions: any[]) {
  console.log("Creating quiz questions:", { count: questions.length, sample: questions[0] })
  
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert(questions)             // Batch insert all questions at once
    .select()
    
  if (error) {
    // Log every available property of the error for thorough diagnosis
    console.error("Supabase createQuizQuestions error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      questionCount: questions.length,
      firstQuestion: questions[0],
      allErrorProps: Object.keys(error),
      stringified: JSON.stringify(error)
    })
    throw new Error(`Failed to create quiz questions: ${error.message || JSON.stringify(error)}`)
  }
  
  console.log("Quiz questions created successfully:", { count: data?.length })
  return data
}

/**
 * updateQuiz — Partial update for a quiz record (e.g. to set title or status)
 */
export async function updateQuiz(id: string, updates: any) {
  const { error } = await supabase
    .from("quizzes")
    .update(updates)
    .eq("id", id)
  if (error) throw error
}

/**
 * deleteQuiz — Permanently removes a quiz and its questions (cascade handled by DB schema)
 */
export async function deleteQuiz(id: string) {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", id)
  if (error) throw error
}

// ============================================================
// QUIZ ATTEMPTS
// ============================================================

/**
 * createQuizAttempt — Records a completed quiz attempt for progress tracking
 */
export async function createQuizAttempt(attemptData: any) {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert(attemptData)
    .select()
  if (error) throw error
  return data[0]
}

// ============================================================
// CONVENIENCE / DASHBOARD QUERIES
// ============================================================

/**
 * getRecentDocuments — Fetch the N most recently uploaded documents
 * Used on the dashboard to populate the "Recent Documents" card
 */
export async function getRecentDocuments(userId: string, limit: number = 5) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)                  // Only fetch `limit` rows (default 5)
  if (error) throw error
  return data
}

/**
 * getFlashcardDecksByDocument — Fetch all decks generated from a specific document
 * Used on the document detail page to list related flashcard sets
 */
export async function getFlashcardDecksByDocument(documentId: string) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("document_id", documentId) // Filter by originating document
  if (error) throw error
  return data
}

/**
 * getQuizzesByDocument — Fetch all quizzes generated from a specific document
 */
export async function getQuizzesByDocument(documentId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("document_id", documentId)
  if (error) throw error
  return data
}

/**
 * getQuizAttemptsByDocument — Fetch all quiz attempts for quizzes tied to a document
 * This is a two-step query: first get quiz IDs, then get attempts for those IDs
 */
export async function getQuizAttemptsByDocument(documentId: string) {
  // Step 1: Get only the IDs of quizzes linked to this document
  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id")                  // Only need the ID, not all columns
    .eq("document_id", documentId)
  
  if (quizzesError) throw quizzesError
  
  // If no quizzes exist for this document, return empty immediately
  if (!quizzes || quizzes.length === 0) {
    return []
  }

  // Extract just the ID strings from the quiz rows
  const quizIds = quizzes.map((q: any) => q.id)

  // Step 2: Fetch all attempts whose quiz_id is in the list of IDs
  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select("*")
    .in("quiz_id", quizIds)        // .in() is the SQL IN operator — matches any value in the array
    .order("completed_at", { ascending: false }) // Most recent first
  
  if (attemptsError) throw attemptsError
  return attempts || []
}

/**
 * updateQuizAttempts — Inserts a new attempt record linked to a quiz
 * (Slightly confusingly named — it actually creates, not updates)
 */
export async function updateQuizAttempts(quizId: string, attempt: any) {
  const { error } = await supabase
    .from("quiz_attempts")
    .insert({
      ...attempt,                  // Spread in score, answers, duration, etc.
      quiz_id: quizId,             // Explicitly set the foreign key
    })
  if (error) throw error
}

/**
 * updateFlashcard — Updates a single flashcard (e.g. to mark as mastered or edit content)
 */
export async function updateFlashcard(id: string, updates: any) {
  const { error } = await supabase
    .from("flashcards")
    .update(updates)               // Apply only the provided fields
    .eq("id", id)
  if (error) throw error
}

// ============================================================
// USERS
// ============================================================

/**
 * getUserProfile — Fetch a user's profile information from the users table
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single()
  if (error) throw error
  return data
}

/**
 * updateUserProfile — Update user profile information (name, preferences, etc)
 */
export async function updateUserProfile(userId: string, updates: any) {
  const { error } = await supabase
    .from("users")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
  if (error) throw error
}

/**
 * getUserPreferences — Fetch a user's preference settings
 */
export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single()
  
  // Return defaults if preferences don't exist yet
  if (error?.code === 'PGRST116') {
    return {
      email_notifications: true,
      study_reminders: true,
      public_profile: false,
    }
  }
  
  if (error) throw error
  return data
}

/**
 * updateUserPreferences — Upsert user preference settings
 */
export async function updateUserPreferences(userId: string, preferences: any) {
  const { error } = await supabase
    .from("user_preferences")
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

/**
 * getUserActivityLog — Fetch the activity log for a user
 */
export async function getUserActivityLog(userId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from("user_activity_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data || []
}

/**
 * logUserActivity — Log a user action for audit trail
 */
export async function logUserActivity(
  userId: string,
  action: string,
  description?: string,
  ipAddress?: string
) {
  const { error } = await supabase
    .from("user_activity_log")
    .insert({
      user_id: userId,
      action,
      description,
      ip_address: ipAddress,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
  
  if (error) {
    // Don't throw — activity logging is non-critical
    console.error("Error logging user activity:", error)
    return
  }
}

/**
 * getUserSessions — Fetch active sessions for a user
 */
export async function getUserSessions(userId: string) {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("last_active_at", { ascending: false })
  
  if (error) throw error
  return data || []
}

/**
 * deleteUserSession — Sign out a specific session
 */
export async function deleteUserSession(sessionId: string) {
  const { error } = await supabase
    .from("user_sessions")
    .delete()
    .eq("id", sessionId)
  
  if (error) throw error
}
