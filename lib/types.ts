// ============================================================================
// SHARED TYPE DEFINITIONS
// All interfaces used across the app are defined here in one place so that
// every file imports from the same source of truth.
// ============================================================================

// Represents a PDF document uploaded by a user
export interface Document {
  id: string              // Unique identifier (UUID from Supabase)
  userId: string          // ID of the user who owns this document
  name: string            // Display name shown in the UI
  originalName: string    // The original filename from the user's computer
  fileUrl: string         // Public or signed URL to the file in Supabase Storage
  fileSize: number        // File size in bytes (used to display "2.4 MB" etc.)
  pageCount: number       // Estimated number of pages in the PDF
  uploadedAt: Date        // When the document was first uploaded
  processedAt?: Date      // When text extraction finished (optional — may not be done yet)
  status: "uploading" | "processing" | "ready" | "error"  // Current pipeline stage
  errorMessage?: string   // Human-readable error if status === "error"
}

// Represents a single flashcard question/answer pair
export interface Flashcard {
  id: string              // Unique identifier for this card
  documentId: string      // Which document this card was generated from
  userId: string          // Owner of this flashcard
  front: string           // The question or term shown on the card face
  back: string            // The answer or definition revealed on flip
  difficulty: "easy" | "medium" | "hard"  // AI-assigned difficulty level
  createdAt: Date         // When the card was generated
  lastReviewed?: Date     // Most recent time the user reviewed this card
  reviewCount: number     // Total number of times the user has seen this card
  correctCount: number    // How many times the user answered correctly
  nextReviewAt?: Date     // Scheduled next review date (for spaced repetition)
}

// Represents a named collection of flashcards tied to one document
export interface FlashcardDeck {
  id: string              // Unique identifier for this deck
  documentId: string      // Document the deck was created from
  userId: string          // Owner of this deck
  name: string            // Title of the deck (e.g. "Chapter 3 - Cell Biology")
  description: string     // Short summary of what the deck covers
  flashcardCount: number  // Number of cards currently in the deck
  createdAt: Date         // When the deck was created
}

// Represents a full quiz tied to a document
export interface Quiz {
  id: string                  // Unique identifier for this quiz
  documentId: string          // Document this quiz was generated from
  userId: string              // Owner of this quiz
  name: string                // Title of the quiz
  questions: QuizQuestion[]   // Array of all the questions in this quiz
  createdAt: Date             // When the quiz was generated
  attempts: QuizAttempt[]     // History of all times this quiz was taken
}

// Represents a single multiple-choice question inside a quiz
export interface QuizQuestion {
  id: string            // Unique identifier for this question
  question: string      // The question text shown to the student
  options: string[]     // Array of four answer choices (A, B, C, D)
  correctAnswer: number // Zero-based index into `options` for the right answer
  explanation: string   // Why the correct answer is right (shown after submission)
}

// Represents one completed attempt at a quiz
export interface QuizAttempt {
  id: string            // Unique identifier for this attempt
  quizId: string        // Which quiz was taken
  userId: string        // Who took the quiz
  score: number         // Number of correct answers
  totalQuestions: number // Total questions in the quiz (used to calculate %)
  answers: number[]     // The answer index the user chose for each question
  completedAt: Date     // Timestamp when the quiz was submitted
  timeTaken: number     // Seconds spent completing the quiz
}

// Represents a single message in an AI chat session
export interface ChatMessage {
  id: string                   // Unique message identifier
  role: "user" | "assistant"   // Who sent this message
  content: string              // The text body of the message
  timestamp: Date              // When this message was sent
  documentContext?: string     // Optional: the document text that was active during this message
}

// Represents an entire chat session between a user and the AI
export interface ChatSession {
  id: string                // Unique session identifier
  userId: string            // Who owns this chat session
  documentId?: string       // Optional: which document this session is about
  title: string             // Auto-generated or user-set title for the conversation
  messages: ChatMessage[]   // Ordered list of all messages in this conversation
  createdAt: Date           // When the session was started
  updatedAt: Date           // Last time a message was added
}

// Represents aggregated learning statistics for a user
export interface UserProgress {
  totalStudyTime: number      // Total seconds spent studying across all sessions
  documentsUploaded: number   // Lifetime count of documents uploaded
  flashcardsCreated: number   // Total flashcards ever generated
  flashcardsReviewed: number  // Total individual card reviews completed
  quizzesTaken: number        // Total number of quizzes submitted
  averageQuizScore: number    // Running average score as a percentage (0–100)
  streakDays: number          // Consecutive days the user has studied
  lastStudyDate?: Date        // Most recent day the user had any study activity
}

// Represents a chunk of text extracted from a document for AI processing
export interface DocumentChunk {
  id: string            // Unique chunk identifier
  documentId: string    // Which document this chunk came from
  content: string       // The actual text content of this chunk (~800 tokens)
  pageNumber: number    // Approximate page number this chunk originated from
  embedding?: number[]  // Optional vector embedding for semantic similarity search
}
