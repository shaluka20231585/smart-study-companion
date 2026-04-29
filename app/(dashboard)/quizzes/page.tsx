// Marks this as a Client Component — required for hooks and event handlers
"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"

// getQuizzes: Fetches all quizzes for a user
// deleteQuiz: Removes a quiz and its questions from the database
import { getQuizzes, deleteQuiz } from "@/lib/queries"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge" // Used to display the best score with colour coding
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { HelpCircle, MoreVertical, Trash2, Play, FileText, Plus, Trophy } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { Quiz } from "@/lib/types"

export default function QuizzesPage() {
  const { user } = useAuth()

  // quizzes: All quizzes belonging to this user
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // quizToDelete: Holds the quiz the user wants to delete until they confirm
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)

  // Memoized so the useEffect dependency array stays stable
  const fetchQuizzes = useCallback(async () => {
    if (!user) return

    try {
      const quizList = await getQuizzes(user.id)
      setQuizzes(quizList || []) // Default to empty if null
    } catch (error) {
      console.error("Error fetching quizzes:", error)
      toast.error("Failed to load quizzes")
    } finally {
      setLoading(false) // Stop showing skeleton cards
    }
  }, [user])

  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  // Handles the confirmed deletion of a quiz
  const handleDelete = async () => {
    if (!quizToDelete) return

    try {
      await deleteQuiz(quizToDelete.id) // Remove from DB (cascades to questions)
      // Remove from local state immediately without a refetch (optimistic update)
      setQuizzes((prev) => prev.filter((q) => q.id !== quizToDelete.id))
      toast.success("Quiz deleted")
    } catch (error) {
      console.error("Error deleting quiz:", error)
      toast.error("Failed to delete quiz")
    } finally {
      setDeleteDialogOpen(false)
      setQuizToDelete(null)
    }
  }

  /**
   * getBestScore — Calculates the highest score percentage across all attempts for a quiz
   * Returns null if the quiz has never been attempted (so we can hide the badge)
   */
  const getBestScore = (quiz: Quiz) => {
    if (!quiz.attempts || quiz.attempts.length === 0) return null // Never attempted
    // Convert raw score to percentage for each attempt, then take the maximum
    const scores = quiz.attempts.map((a) => (a.score / a.totalQuestions) * 100)
    return Math.max(...scores)
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Page heading + create button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">Test your knowledge with AI-generated quizzes</p>
        </div>
        {/* Direct user to Documents to generate new quizzes */}
        <Link href="/documents">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create from Document
          </Button>
        </Link>
      </div>

      {/* — LOADING STATE — skeleton cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        // — EMPTY STATE — user has no quizzes yet
        <Card className="py-16">
          <CardContent className="text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No quizzes yet</h3>
            <p className="mt-2 text-muted-foreground">
              Generate quizzes from your uploaded documents
            </p>
            <Link href="/documents">
              <Button className="mt-6 gap-2">
                <FileText className="h-4 w-4" />
                Go to Documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        // — QUIZ GRID — one card per quiz
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            // Calculate best score once per quiz so we can conditionally render the badge
            const bestScore = getBestScore(quiz)
            return (
              <Card key={quiz.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Amber icon badge identifies quiz cards */}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                        <HelpCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{quiz.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {quiz.createdAt?.toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Per-quiz action dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/quizzes/${quiz.id}`}>
                            <Play className="mr-2 h-4 w-4" />
                            Take Quiz
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setQuizToDelete(quiz)      // Remember which quiz to delete
                            setDeleteDialogOpen(true)   // Open confirmation dialog
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                {/* Quiz metadata */}
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Questions</span>
                      {/* Fallback to 0 if questions array isn't loaded */}
                      <span className="font-medium">{quiz.questions?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attempts</span>
                      <span className="font-medium">{quiz.attempts?.length || 0}</span>
                    </div>
                    {/* Best score badge — only shown if the quiz has been attempted */}
                    {bestScore !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Best Score</span>
                        {/* Badge colour: green ≥ 80%, secondary ≥ 60%, outline otherwise */}
                        <Badge
                          variant={bestScore >= 80 ? "default" : bestScore >= 60 ? "secondary" : "outline"}
                          className={bestScore >= 80 ? "bg-emerald-500" : ""}
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          {Math.round(bestScore)}%
                        </Badge>
                      </div>
                    )}
                    {/* CTA button — shows "Retake" if attempted, "Start" if not */}
                    <Link href={`/quizzes/${quiz.id}`}>
                      <Button className="w-full gap-2 mt-2">
                        <Play className="h-4 w-4" />
                        {quiz.attempts?.length ? "Retake Quiz" : "Start Quiz"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{quizToDelete?.name}&quot;? This will also delete
              all attempt history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
