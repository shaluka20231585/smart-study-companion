"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getDocuments, getFlashcardDecks, getQuizzes } from "@/lib/queries"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart3,
  FileText,
  Brain,
  HelpCircle,
  Trophy,
  Target,
  TrendingUp,
} from "lucide-react"

interface ProgressStats {
  documentsCount: number
  flashcardDecksCount: number
  totalFlashcards: number
  quizzesCount: number
  quizAttempts: number
  averageQuizScore: number
  bestQuizScore: number
  flashcardsReviewed: number
  correctAnswers: number
}

export default function ProgressPage() {
  const { user } = useAuth()
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProgressData() {
      if (!user) return

      try {
        // Fetch all data in parallel
        const [docs, decks, quizzes] = await Promise.all([
          getDocuments(user.id),
          getFlashcardDecks(user.id),
          getQuizzes(user.id),
        ])

        // Fetch flashcard stats
        const { data: flashcards } = await supabase
          .from("flashcards")
          .select("*")
        
        let flashcardsReviewed = 0
        let correctAnswers = 0
        flashcards?.forEach((card: any) => {
          flashcardsReviewed += card.review_count || 0
          correctAnswers += card.correct_count || 0
        })

        // Fetch quiz attempts for scoring stats
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("*")

        let totalAttempts = 0
        let totalScore = 0
        let bestScore = 0
        attempts?.forEach((attempt: any) => {
          totalAttempts += 1
          const score = (attempt.score / attempt.total_questions) * 100
          totalScore += score
          if (score > bestScore) bestScore = score
        })

        setStats({
          documentsCount: docs?.length || 0,
          flashcardDecksCount: decks?.length || 0,
          totalFlashcards: flashcards?.length || 0,
          quizzesCount: quizzes?.length || 0,
          quizAttempts: totalAttempts,
          averageQuizScore: totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0,
          bestQuizScore: Math.round(bestScore),
          flashcardsReviewed,
          correctAnswers,
        })
      } catch (error) {
        console.error("Error fetching progress:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProgressData()
  }, [user])

  const flashcardAccuracy =
    stats.flashcardsReviewed > 0
      ? Math.round((stats.correctAnswers / stats.flashcardsReviewed) * 100)
      : 0

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
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

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flashcards
            </CardTitle>
            <Brain className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFlashcards}</div>
            <p className="text-xs text-muted-foreground">
              Across {stats.flashcardDecksCount} decks
            </p>
          </CardContent>
        </Card>

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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Flashcard Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Flashcard Performance
            </CardTitle>
            <CardDescription>Your flashcard study statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cards Reviewed</span>
                <span className="font-medium">{stats.flashcardsReviewed}</span>
              </div>
              <Progress value={Math.min((stats.flashcardsReviewed / 100) * 100, 100)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Accuracy Rate</span>
                <span className="font-medium">{flashcardAccuracy}%</span>
              </div>
              <Progress
                value={flashcardAccuracy}
                className={flashcardAccuracy >= 80 ? "[&>div]:bg-emerald-500" : ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.correctAnswers}</p>
                <p className="text-xs text-emerald-600">Correct Answers</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-4 text-center">
                <p className="text-2xl font-bold text-rose-600">
                  {stats.flashcardsReviewed - stats.correctAnswers}
                </p>
                <p className="text-xs text-rose-600">Incorrect Answers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quiz Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Quiz Performance
            </CardTitle>
            <CardDescription>Your quiz statistics over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Quizzes Completed</span>
                <span className="font-medium">{stats.quizAttempts}</span>
              </div>
              <Progress value={Math.min((stats.quizAttempts / 10) * 100, 100)} />
            </div>

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

      {/* Learning Goals */}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Documents Reviewed</span>
                <span className="font-medium">{stats.documentsCount}/5</span>
              </div>
              <Progress value={Math.min((stats.documentsCount / 5) * 100, 100)} />
              <p className="text-xs text-muted-foreground">
                {Math.max(0, 5 - stats.documentsCount)} more to reach your goal
              </p>
            </div>

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
