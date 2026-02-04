"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getQuizzes, deleteQuiz } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)

  const fetchQuizzes = useCallback(async () => {
    if (!user) return

    try {
      const quizList = await getQuizzes(user.id)
      setQuizzes(quizList || [])
    } catch (error) {
      console.error("Error fetching quizzes:", error)
      toast.error("Failed to load quizzes")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchQuizzes()
  }, [fetchQuizzes])

  const handleDelete = async () => {
    if (!quizToDelete) return

    try {
      await deleteQuiz(quizToDelete.id)
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

  const getBestScore = (quiz: Quiz) => {
    if (!quiz.attempts || quiz.attempts.length === 0) return null
    const scores = quiz.attempts.map((a) => (a.score / a.totalQuestions) * 100)
    return Math.max(...scores)
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">Test your knowledge with AI-generated quizzes</p>
        </div>
        <Link href="/documents">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create from Document
          </Button>
        </Link>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => {
            const bestScore = getBestScore(quiz)
            return (
              <Card key={quiz.id} className="group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
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
                            setQuizToDelete(quiz)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Questions</span>
                      <span className="font-medium">{quiz.questions?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attempts</span>
                      <span className="font-medium">{quiz.attempts?.length || 0}</span>
                    </div>
                    {bestScore !== null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Best Score</span>
                        <Badge
                          variant={bestScore >= 80 ? "default" : bestScore >= 60 ? "secondary" : "outline"}
                          className={bestScore >= 80 ? "bg-emerald-500" : ""}
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          {Math.round(bestScore)}%
                        </Badge>
                      </div>
                    )}
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
