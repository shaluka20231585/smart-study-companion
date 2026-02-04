export interface Document {
  id: string
  userId: string
  name: string
  originalName: string
  fileUrl: string
  fileSize: number
  pageCount: number
  uploadedAt: Date
  processedAt?: Date
  status: "uploading" | "processing" | "ready" | "error"
  errorMessage?: string
}

export interface Flashcard {
  id: string
  documentId: string
  userId: string
  front: string
  back: string
  difficulty: "easy" | "medium" | "hard"
  createdAt: Date
  lastReviewed?: Date
  reviewCount: number
  correctCount: number
  nextReviewAt?: Date
}

export interface FlashcardDeck {
  id: string
  documentId: string
  userId: string
  name: string
  description: string
  flashcardCount: number
  createdAt: Date
}

export interface Quiz {
  id: string
  documentId: string
  userId: string
  name: string
  questions: QuizQuestion[]
  createdAt: Date
  attempts: QuizAttempt[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface QuizAttempt {
  id: string
  quizId: string
  userId: string
  score: number
  totalQuestions: number
  answers: number[]
  completedAt: Date
  timeTaken: number
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  documentContext?: string
}

export interface ChatSession {
  id: string
  userId: string
  documentId?: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface UserProgress {
  totalStudyTime: number
  documentsUploaded: number
  flashcardsCreated: number
  flashcardsReviewed: number
  quizzesTaken: number
  averageQuizScore: number
  streakDays: number
  lastStudyDate?: Date
}

export interface DocumentChunk {
  id: string
  documentId: string
  content: string
  pageNumber: number
  embedding?: number[]
}
