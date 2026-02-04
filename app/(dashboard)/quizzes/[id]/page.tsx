"use client"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getQuizById, getQuizQuestions, updateQuizAttempts } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  HelpCircle,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { Quiz, QuizQuestion } from "@/lib/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function TakeQuizPage({ params }: PageProps) {
  const { id } = use(params)
  const { user } = useAuth()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])
  const [showResults, setShowResults] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    async function fetchQuiz() {
      if (!user || !id) return

      try {
        console.log("Fetching quiz with ID:", id, "for user:", user.id)
        
        const quizData = await getQuizById(id, user.id)

        if (quizData) {
          console.log("Quiz data retrieved:", quizData)
          
          const questions = await getQuizQuestions(id)
          console.log("Quiz questions retrieved:", questions)
          
          setQuiz({
            id: quizData.id,
            ...quizData,
            questions: questions || [],
          } as Quiz)
          setSelectedAnswers(new Array(questions?.length || 0).fill(null))
        } else {
          console.error("Quiz not found - no data returned from database")
          toast.error("Quiz not found")
        }
      } catch (error) {
        console.error("Error fetching quiz:", error)
        toast.error("Failed to load quiz")
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [user, id])

  const startQuiz = () => {
    setIsStarted(true)
    setStartTime(new Date())
    setCurrentIndex(0)
    setSelectedAnswers(new Array(quiz?.questions?.length || 0).fill(null))
    setShowResults(false)
  }

  const selectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentIndex] = answerIndex
    setSelectedAnswers(newAnswers)
  }

  const nextQuestion = () => {
    if (currentIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const submitQuiz = async () => {
    if (!quiz || !user || !startTime) return

    const endTime = new Date()
    const timeTaken = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    let score = 0
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++
      }
    })

    // Save attempt to Supabase
    try {
      await updateQuizAttempts(id, {
        user_id: user.id,
        score,
        total_questions: quiz.questions.length,
        answers: JSON.stringify(selectedAnswers),
        completed_at: new Date().toISOString(),
        time_taken: timeTaken,
      })
    } catch (error) {
      console.error("Error saving attempt:", error)
    }

    setShowResults(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
      </div>
    )
  }

  if (!quiz || !quiz.questions?.length) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/quizzes" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Link>
        <Card className="py-16 max-w-3xl mx-auto">
          <CardContent className="text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Quiz not found</h3>
            <p className="mt-2 text-muted-foreground">
              This quiz doesn&apos;t exist or has no questions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show start screen
  if (!isStarted) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/quizzes" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Link>
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <HelpCircle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">{quiz.name}</CardTitle>
            <CardDescription>Test your knowledge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">{quiz.questions.length}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-bold">{quiz.attempts?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Previous Attempts</p>
              </div>
            </div>
            {quiz.attempts && quiz.attempts.length > 0 && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground mb-2">Best Score</p>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="text-xl font-bold">
                    {Math.round(
                      Math.max(...quiz.attempts.map((a) => (a.score / a.totalQuestions) * 100))
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
            <Button onClick={startQuiz} className="w-full gap-2" size="lg">
              <HelpCircle className="h-5 w-5" />
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show results
  if (showResults) {
    let score = 0
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++
      }
    })
    const percentage = Math.round((score / quiz.questions.length) * 100)
    const timeTaken = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 1000) : 0

    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/quizzes" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Link>
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="text-center">
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                percentage >= 80
                  ? "bg-emerald-100"
                  : percentage >= 60
                  ? "bg-amber-100"
                  : "bg-rose-100"
              }`}
            >
              {percentage >= 80 ? (
                <Trophy className="h-8 w-8 text-emerald-600" />
              ) : percentage >= 60 ? (
                <CheckCircle className="h-8 w-8 text-amber-600" />
              ) : (
                <XCircle className="h-8 w-8 text-rose-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {percentage >= 80 ? "Excellent!" : percentage >= 60 ? "Good job!" : "Keep practicing!"}
            </CardTitle>
            <CardDescription>You completed the quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{percentage}%</p>
              <p className="text-muted-foreground mt-2">
                {score} out of {quiz.questions.length} correct
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Time: {formatTime(timeTaken)}</span>
            </div>

            {/* Review Answers */}
            <div className="space-y-4">
              <h3 className="font-semibold">Review Answers</h3>
              {quiz.questions.map((question, qIndex) => {
                const isCorrect = selectedAnswers[qIndex] === question.correctAnswer
                return (
                  <div key={qIndex} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          isCorrect ? "bg-emerald-100" : "bg-rose-100"
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium mb-2">
                          {qIndex + 1}. {question.question}
                        </p>
                        <div className="space-y-1 text-sm">
                          {question.options.map((option, oIndex) => (
                            <p
                              key={oIndex}
                              className={`${
                                oIndex === question.correctAnswer
                                  ? "text-emerald-600 font-medium"
                                  : selectedAnswers[qIndex] === oIndex
                                  ? "text-rose-600"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {String.fromCharCode(65 + oIndex)}. {option}
                              {oIndex === question.correctAnswer && " (Correct)"}
                              {selectedAnswers[qIndex] === oIndex &&
                                oIndex !== question.correctAnswer &&
                                " (Your answer)"}
                            </p>
                          ))}
                        </div>
                        {question.explanation && (
                          <p className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                            {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <Button onClick={startQuiz} className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" />
                Retake Quiz
              </Button>
              <Link href="/quizzes" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Back to Quizzes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show quiz questions
  const currentQuestion = quiz.questions[currentIndex]
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100
  const answeredCount = selectedAnswers.filter((a) => a !== null).length

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quizzes" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{quiz.name}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {quiz.questions.length}
            </p>
          </div>
        </div>
        <Badge variant="outline">
          {answeredCount}/{quiz.questions.length} answered
        </Badge>
      </div>

      <Progress value={progress} className="h-2" />

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => selectAnswer(index)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selectedAnswers[currentIndex] === index
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <Button variant="outline" onClick={prevQuestion} disabled={currentIndex === 0}>
          Previous
        </Button>
        <div className="flex gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                currentIndex === index
                  ? "bg-primary"
                  : selectedAnswers[index] !== null
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
        {currentIndex < quiz.questions.length - 1 ? (
          <Button onClick={nextQuestion}>Next</Button>
        ) : (
          <Button onClick={submitQuiz} disabled={answeredCount < quiz.questions.length}>
            Submit Quiz
          </Button>
        )}
      </div>
    </div>
  )
}
