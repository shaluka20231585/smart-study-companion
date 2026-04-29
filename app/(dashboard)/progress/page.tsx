// Marks this as a Client Component — required for hooks
"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"

// Query helpers: fetch counts used to build the stats object
import { getDocuments, getFlashcardDecks, getQuizzes } from "@/lib/queries"

// Direct Supabase client — used to query flashcards and quiz_attempts tables
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"  // Horizontal progress bar for goal tracking
import { Skeleton } from "@/components/ui/skeleton"  // Placeholder while loading

// Icon imports for the stat cards and section headings
import {
  BarChart3,     // (imported but not rendered — reserved for future chart)
  FileText,      // Documents stat card icon
  Brain,         // Flashcards section icon
  HelpCircle,    // Quizzes section icon
  Trophy,        // Best score and quiz performance icons
  Target,        // Average score icon
  TrendingUp,    // Learning Goals section icon
} from "lucide-react"

// Shape of all the aggregated stats shown on this page
interface ProgressStats {
  documentsCount: number        // Total PDFs uploaded
  flashcardDecksCount: number   // Total flashcard decks created
  totalFlashcards: number       // Total individual flashcard cards (across all decks)
  quizzesCount: number          // Total quizzes generated
  quizAttempts: number          // Total number of quiz attempts across all quizzes
  averageQuizScore: number      // Mean score percentage across all attempts
  bestQuizScore: number         // Highest single attempt score percentage
  flashcardsReviewed: number    // Sum of review_count across all flashcards
  correctAnswers: number        // Sum of correct_count across all flashcards
}

export default function ProgressPage() {
  const { user } = useAuth()

  // Initialize all stats to 0 — prevents undefined errors before data loads
  const [stats, setStats] = useState<ProgressStats>({
    documentsCount: 0,
    flashcardDecksCount: 0,
    totalFlashcards: 0,
    quizzesCount: 0,
    quizAttempts: 0,
    averageQuizScore: 0,
    bestQuizScore: 0,
    flashcardsReviewed: 0,
    correctAnswers: 0,
  })

  // loading: True while all parallel data fetches are in progress
  const [loading, setLoading] = useState(true)

  // Fetch all progress data once after the component mounts
  useEffect(() => {
    async function fetchProgressData() {
      if (!user) return

      try {
        // Step 1: Fetch high-level counts in parallel
        const [docs, decks, quizzes] = await Promise.all([
          getDocuments(user.id),
          getFlashcardDecks(user.id),
          getQuizzes(user.id),
        ])

        // Step 2: Fetch flashcard review stats directly from the table
        // (these are not aggregated by getFlashcardDecks)
        const { data: flashcards } = await supabase
          .from("flashcards")
          .select("*")
        
        // Accumulate review and correct counts across all flashcard rows
        let flashcardsReviewed = 0
        let correctAnswers = 0
        flashcards?.forEach((card: any) => {
          flashcardsReviewed += card.review_count || 0   // 0 if never reviewed
          correctAnswers += card.correct_count || 0       // 0 if never answered correctly
        })

        // Step 3: Fetch all quiz attempt rows to calculate scoring stats
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("*")

        let totalAttempts = 0
        let totalScore = 0
        let bestScore = 0
        attempts?.forEach((attempt: any) => {
          totalAttempts += 1
          const score = (attempt.score / attempt.total_questions) * 100 // Convert to percentage
          totalScore += score
          if (score > bestScore) bestScore = score // Track the highest score seen
        })

        // Update all stats at once (single re-render)
        setStats({
          documentsCount:      docs?.length    || 0,
          flashcardDecksCount: decks?.length   || 0,
          totalFlashcards:     flashcards?.length || 0,
          quizzesCount:        quizzes?.length || 0,
          quizAttempts:        totalAttempts,
          // Avoid dividing by zero if there are no attempts
          averageQuizScore: totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0,
          bestQuizScore: Math.round(bestScore),
          flashcardsReviewed,
          correctAnswers,
        })
      } catch (error) {
        console.error("Error fetching progress:", error)
      } finally {
        setLoading(false) // Stop showing skeleton layout
      }
    }

    fetchProgressData()
  }, [user])

  // Derived stat: percentage of flashcard reviews that were answered correctly
  // Guard against division by zero (no reviews yet)
  const flashcardAccuracy =
    stats.flashcardsReviewed > 0
      ? Math.round((stats.correctAnswers / stats.flashcardsReviewed) * 100)
      : 0

  // Show a full-page skeleton layout while loading (matches real page structure)
  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <div>
          <Skeleton className="h-8 w-48" />      {/* Page heading */}
          <Skeleton className="h-4 w-64 mt-1" /> {/* Subtitle */}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" /> // One skeleton per stat card
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" /> {/* Flashcard performance card */}
          <Skeleton className="h-64" /> {/* Quiz performance card */}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">Track your learning journey</p>
      </div>

      {/* — OVERVIEW STAT CARDS — */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Documents count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentsCount}</div>
            <p className="text-xs text-muted-foreground">Study materials uploaded</p>
          </CardContent>
        </Card>

        {/* Total flashcards count */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flashcards
            </CardTitle>
            <Brain className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFlashcards}</div>
            {/* Sub-label shows how many decks these cards are spread across */}
            <p className="text-xs text-muted-foreground">
              Across {stats.flashcardDecksCount} decks
            </p>
          </CardContent>
        </Card>

        {/* Quiz count + total attempts sub-label */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quizzes
            </CardTitle>
            <HelpCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quizzesCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.quizAttempts} attempts total
            </p>
          </CardContent>
        </Card>

        {/* Best quiz score — shows — if never attempted */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Best Quiz Score
            </CardTitle>
            <Trophy className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.bestQuizScore > 0 ? `${stats.bestQuizScore}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Your highest achievement</p>
          </CardContent>
        </Card>
      </div>

      {/* — PERFORMANCE DETAIL CARDS — */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Flashcard Performance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Flashcard Performance
            </CardTitle>
            <CardDescription>Your flashcard study statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cards reviewed progress (goal: 100) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cards Reviewed</span>
                <span className="font-medium">{stats.flashcardsReviewed}</span>
              </div>
              {/* Cap at 100% so the bar doesn't overflow */}
              <Progress value={Math.min((stats.flashcardsReviewed / 100) * 100, 100)} />
            </div>

            {/* Accuracy rate progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Accuracy Rate</span>
                <span className="font-medium">{flashcardAccuracy}%</span>
              </div>
              {/* Change bar colour to green when accuracy is 80%+ */}
              <Progress
                value={flashcardAccuracy}
                className={flashcardAccuracy >= 80 ? "[&>div]:bg-emerald-500" : ""}
              />
            </div>

            {/* Correct vs incorrect summary boxes */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.correctAnswers}</p>
                <p className="text-xs text-emerald-600">Correct Answers</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-4 text-center">
                {/* Incorrect count derived from total reviews minus correct reviews */}
                <p className="text-2xl font-bold text-rose-600">
                  {stats.flashcardsReviewed - stats.correctAnswers}
                </p>
                <p className="text-xs text-rose-600">Incorrect Answers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Performance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Quiz Performance
            </CardTitle>
            <CardDescription>Your quiz statistics over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Average score progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Average Score</span>
                <span className="font-medium">{stats.averageQuizScore}%</span>
              </div>
              <Progress
                value={stats.averageQuizScore}
                className={stats.averageQuizScore >= 80 ? "[&>div]:bg-emerald-500" : ""}
              />
            </div>

            {/* Quizzes completed progress (goal: 10) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Quizzes Completed</span>
                <span className="font-medium">{stats.quizAttempts}</span>
              </div>
              <Progress value={Math.min((stats.quizAttempts / 10) * 100, 100)} />
            </div>

            {/* Average vs best score comparison boxes */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="rounded-lg bg-primary/10 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Target className="h-4 w-4 text-primary" />
                  <p className="text-2xl font-bold text-primary">{stats.averageQuizScore}%</p>
                </div>
                <p className="text-xs text-muted-foreground">Average Score</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  <p className="text-2xl font-bold text-amber-600">{stats.bestQuizScore}%</p>
                </div>
                <p className="text-xs text-amber-600">Best Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* — LEARNING GOALS CARD — */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Learning Goals
          </CardTitle>
          <CardDescription>Track your progress towards weekly goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">

            {/* Goal 1: Review 5 documents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Documents Reviewed</span>
                <span className="font-medium">{stats.documentsCount}/5</span>
              </div>
              <Progress value={Math.min((stats.documentsCount / 5) * 100, 100)} />
              <p className="text-xs text-muted-foreground">
                {/* Math.max(0, …) prevents negative "remaining" counts */}
                {Math.max(0, 5 - stats.documentsCount)} more to reach your goal
              </p>
            </div>

            {/* Goal 2: Study 50 flashcards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Flashcards Studied</span>
                <span className="font-medium">{stats.flashcardsReviewed}/50</span>
              </div>
              <Progress value={Math.min((stats.flashcardsReviewed / 50) * 100, 100)} />
              <p className="text-xs text-muted-foreground">
                {Math.max(0, 50 - stats.flashcardsReviewed)} more to reach your goal
              </p>
            </div>

            {/* Goal 3: Complete 10 quizzes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Quizzes Completed</span>
                <span className="font-medium">{stats.quizAttempts}/10</span>
              </div>
              <Progress value={Math.min((stats.quizAttempts / 10) * 100, 100)} />
              <p className="text-xs text-muted-foreground">
                {Math.max(0, 10 - stats.quizAttempts)} more to reach your goal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
