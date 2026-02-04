import { supabase } from "@/lib/supabase"

// Documents
export async function getDocuments(userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getDocumentById(id: string, userId: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()
  if (error) throw error
  return data
}

export async function getDocumentContent(documentId: string) {
  const { data, error } = await supabase
    .from("document_contents")
    .select("*")
    .eq("document_id", documentId)
    .single()
  if (error) throw error
  return data
}

// Fetch reconstructed text from document chunks
export async function getDocumentTextFromChunks(documentId: string): Promise<string> {
  const { data, error } = await supabase
    .from("document_chunks")
    .select("chunk_text")
    .eq("document_id", documentId)
    .order("chunk_index", { ascending: true })
  
  if (error) throw error
  if (!data || data.length === 0) return ""
  
  // Reconstruct full text from chunks
  return data.map((chunk: any) => chunk.chunk_text).join("\n")
}

export async function updateDocument(id: string, updates: any) {
  const { error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", id)
  if (error) throw error
}

export async function deleteDocument(id: string) {
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function createDocumentContent(documentId: string, content: any) {
  const { data, error } = await supabase
    .from("document_contents")
    .insert({
      document_id: documentId,
      ...content,
    })
    .select()
  if (error) throw error
  return data
}

// Flashcards
export async function getFlashcardDecks(userId: string) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getFlashcardsByDeck(deckId: string) {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", deckId)
  if (error) throw error
  return data
}

export async function getFlashcardDeckById(id: string, userId: string) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()
  if (error) throw error
  return data
}

export async function deleteFlashcardDeck(id: string) {
  // Delete all flashcards in the deck first
  const { error: flashcardsError } = await supabase
    .from("flashcards")
    .delete()
    .eq("deck_id", id)
  if (flashcardsError) throw flashcardsError

  // Then delete the deck
  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function createFlashcardDeck(deckData: any) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .insert(deckData)
    .select()
  if (error) throw error
  return data[0]
}

export async function createFlashcards(flashcards: any[]) {
  const { data, error } = await supabase
    .from("flashcards")
    .insert(flashcards)
    .select()
  if (error) throw error
  return data
}

// Quizzes
export async function getQuizzes(userId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getQuizById(id: string, userId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single()
  
  if (error) {
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

export async function getQuizQuestions(quizId: string) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true })
  if (error) throw error
  
  // Transform the data: parse JSON options and fix field names for compatibility
  return data?.map((q: any) => ({
    id: q.id,
    quiz_id: q.quiz_id,
    question: q.question,
    options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
    correct_answer: q.correct_answer,
    correctAnswer: q.correct_answer, // Alias for compatibility with display code
    explanation: q.explanation || "",
    order: q.order,
    created_at: q.created_at,
  })) || []
}

export async function createQuiz(quizData: any) {
  const { data, error } = await supabase
    .from("quizzes")
    .insert(quizData)
    .select()
  if (error) {
    console.error("Supabase createQuiz error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      quizData
    })
    throw error
  }
  return data[0]
}

export async function createQuizQuestions(questions: any[]) {
  console.log("Creating quiz questions:", { count: questions.length, sample: questions[0] })
  
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert(questions)
    .select()
    
  if (error) {
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

export async function updateQuiz(id: string, updates: any) {
  const { error } = await supabase
    .from("quizzes")
    .update(updates)
    .eq("id", id)
  if (error) throw error
}

export async function deleteQuiz(id: string) {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", id)
  if (error) throw error
}

// Quiz Attempts
export async function createQuizAttempt(attemptData: any) {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert(attemptData)
    .select()
  if (error) throw error
  return data[0]
}

export async function getRecentDocuments(userId: string, limit: number = 5) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getFlashcardDecksByDocument(documentId: string) {
  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("document_id", documentId)
  if (error) throw error
  return data
}

export async function getQuizzesByDocument(documentId: string) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("document_id", documentId)
  if (error) throw error
  return data
}

export async function getQuizAttemptsByDocument(documentId: string) {
  // First get all quizzes for this document
  const { data: quizzes, error: quizzesError } = await supabase
    .from("quizzes")
    .select("id")
    .eq("document_id", documentId)
  
  if (quizzesError) throw quizzesError
  
  if (!quizzes || quizzes.length === 0) {
    return []
  }

  const quizIds = quizzes.map((q: any) => q.id)

  // Then get all attempts for those quizzes
  const { data: attempts, error: attemptsError } = await supabase
    .from("quiz_attempts")
    .select("*")
    .in("quiz_id", quizIds)
    .order("completed_at", { ascending: false })
  
  if (attemptsError) throw attemptsError
  return attempts || []
}

export async function updateQuizAttempts(quizId: string, attempt: any) {
  const { error } = await supabase
    .from("quiz_attempts")
    .insert({
      ...attempt,
      quiz_id: quizId,
    })
  if (error) throw error
}

export async function updateFlashcard(id: string, updates: any) {
  const { error } = await supabase
    .from("flashcards")
    .update(updates)
    .eq("id", id)
  if (error) throw error
}
