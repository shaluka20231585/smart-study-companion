// Client Component — required for hooks, timer, and answer selection
"use client"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"

// Query helpers for loading the quiz and persisting attempt results
import { getQuizById, getQuizQuestions, updateQuizAttempts } from "@/lib/queries"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress" // Top progress bar
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"       // "X/Y answered" counter in header

// Icon imports
import {
  ArrowLeft,    // Back navigation
  HelpCircle,   // Quiz icon and empty state
  CheckCircle,  // Correct answer indicator in review
  XCircle,      // Incorrect answer indicator in review
  Trophy,       // Best score and result header
  RotateCcw,    // Retake Quiz button
  Clock,        // Time taken display in results
} from "lucide-react"

import { toast } from "sonner"
import Link from "next/link"
import type { Quiz, QuizQuestion } from "@/lib/types"

// PageProps — params is a Promise in Next.js 15+
interface PageProps {
  params: Promise<{ id: string }>
}

export default function TakeQuizPage({ params }: PageProps) {
  const { id } = use(params) // Unwrap params Promise with React's `use()` hook
  const { user } = useAuth()

  // quiz: Full quiz data including questions and past attempts
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)

  // currentIndex: Index of the currently displayed question (0-based)
  const [currentIndex, setCurrentIndex] = useState(0)

  // selectedAnswers: User's chosen option index per question (null = not answered)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])

  // showResults: True after the user submits the quiz
  const [showResults, setShowResults] = useState(false)

  // startTime: Recorded when the quiz starts — used to calculate elapsed time
  const [startTime, setStartTime] = useState<Date | null>(null)

  // isStarted: False on the pre-quiz info screen, True during active quiz
  const [isStarted, setIsStarted] = useState(false)

  // Fetch quiz metadata and questions on mount
  useEffect(() => {
    async function fetchQuiz() {
      if (!user || !id) return

      try {
        console.log("Fetching quiz with ID:", id, "for user:", user.id)
        
        const quizData = await getQuizById(id, user.id) // Validates ownership

        if (quizData) {
          console.log("Quiz data retrieved:", quizData)
          
          // Fetch questions separately (stored in quiz_questions table)
          const questions = await getQuizQuestions(id)
          console.log("Quiz questions retrieved:", questions)
          
          // Merge questions into the quiz object
          setQuiz({
            id: quizData.id,
            ...quizData,
            questions: questions || [],
          } as Quiz)
          // Pre-fill selectedAnswers with nulls — one slot per question
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

  /**
   * startQuiz — Transitions from the info screen to the active quiz
   * Records the start time for elapsed time calculation
   */
  const startQuiz = () => {
    setIsStarted(true)                                               // Show question UI
    setStartTime(new Date())                                         // Begin timer
    setCurrentIndex(0)                                               // Reset to first question
    setSelectedAnswers(new Array(quiz?.questions?.length || 0).fill(null)) // Clear previous answers
    setShowResults(false)                                            // Hide results if retaking
  }

  /**
   * selectAnswer — Records the user's chosen option for the current question
   * Immutably updates only the slot for the current question
   */
  const selectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers]    // Shallow copy to avoid mutating state
    newAnswers[currentIndex] = answerIndex     // Record this question's selection
    setSelectedAnswers(newAnswers)
  }

  // Advance to the next question (if not on the last)
  const nextQuestion = () => {
    if (currentIndex < (quiz?.questions?.length || 0) - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  // Go back to the previous question (if not on the first)
  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  /**
   * submitQuiz — Grades the quiz, saves the attempt to Supabase, and shows results
   */
  const submitQuiz = async () => {
    if (!quiz || !user || !startTime) return

    const endTime = new Date()
    // Time in seconds from start to submit
    const timeTaken = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

    // Count correct answers by comparing selectedAnswers to correctAnswer index
    let score = 0
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++
      }
    })

    // Persist the attempt — allows progress tracking and best-score display
    try {
      await updateQuizAttempts(id, {
        user_id:         user.id,
        score,
        total_questions: quiz.questions.length,
        answers:         JSON.stringify(selectedAnswers), // Store raw selections as JSON string
        completed_at:    new Date().toISOString(),
        time_taken:      timeTaken,
      })
    } catch (error) {
      console.error("Error saving attempt:", error) // Non-blocking — still show results
    }

    setShowResults(true) // Switch to results screen
  }

  /**
   * formatTime — Converts elapsed seconds to "M:SS" display format
   * e.g. 90 seconds → "1:30"
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}` // padStart ensures two-digit seconds
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
      </div>
    )
  }

  // — NOT FOUND STATE — Quiz ID doesn't exist or has no questions
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

  // — START SCREEN — Shown before the user presses "Start Quiz"
  if (!isStarted) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/quizzes" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Quizzes
        </Link>
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            {/* Amber circle with a question-mark icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <HelpCircle className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">{quiz.name}</CardTitle>
            <CardDescription>Test your knowledge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats grid: question count and previous attempt count */}
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
            {/* Best score box — only shown if at least one prior attempt exists */}
            {quiz.attempts && quiz.attempts.length > 0 && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground mb-2">Best Score</p>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="text-xl font-bold">
                    {/* Spread all attempt percentages into Math.max to find the highest */}
                    {Math.round(
                      Math.max(...quiz.attempts.map((a) => (a.score / a.totalQuestions) * 100))
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
            {/* Start button: sets isStarted=true and records startTime */}
            <Button onClick={startQuiz} className="w-full gap-2" size="lg">
              <HelpCircle className="h-5 w-5" />
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // — RESULTS SCREEN — Shown after submitQuiz() sets showResults=true
  if (showResults) {
    // Grade the quiz by comparing each selected answer to the correct answer index
    let score = 0
    quiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++
      }
    })
    // Calculate percentage and elapsed time
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
            {/* Icon circle colour depends on score tier: ≥80% emerald, ≥60% amber, else rose */}
            <div
              className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                percentage >= 80
                  ? "bg-emerald-100"
                  : percentage >= 60
                  ? "bg-amber-100"
                  : "bg-rose-100"
              }`}
            >
              {/* Icon also changes by tier: Trophy / CheckCircle / XCircle */}
              {percentage >= 80 ? (
                <Trophy className="h-8 w-8 text-emerald-600" />
              ) : percentage >= 60 ? (
                <CheckCircle className="h-8 w-8 text-amber-600" />
              ) : (
                <XCircle className="h-8 w-8 text-rose-600" />
              )}
            </div>
            {/* Encouraging headline based on tier */}
            <CardTitle className="text-2xl">
              {percentage >= 80 ? "Excellent!" : percentage >= 60 ? "Good job!" : "Keep practicing!"}
            </CardTitle>
            <CardDescription>You completed the quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Large percentage score in primary colour */}
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{percentage}%</p>
              <p className="text-muted-foreground mt-2">
                {score} out of {quiz.questions.length} correct
              </p>
            </div>
            {/* Time taken formatted as mm:ss */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Time: {formatTime(timeTaken)}</span>
            </div>

            {/* — REVIEW ANSWERS — Full per-question breakdown */}
            <div className="space-y-4">
              <h3 className="font-semibold">Review Answers</h3>
              {quiz.questions.map((question, qIndex) => {
                const isCorrect = selectedAnswers[qIndex] === question.correctAnswer
                return (
                  <div key={qIndex} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-3">
                      {/* Correct/incorrect indicator circle */}
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
                                  ? "text-emerald-600 font-medium"  // Always highlight correct answer in green
                                  : selectedAnswers[qIndex] === oIndex
                                  ? "text-rose-600"                 // Highlight wrong selected answer in red
                                  : "text-muted-foreground"         // All other options dimmed
                              }`}
                            >
                              {/* A/B/C/D label via ASCII offset: 65='A', 66='B', etc. */}
                              {String.fromCharCode(65 + oIndex)}. {option}
                              {oIndex === question.correctAnswer && " (Correct)"}
                              {selectedAnswers[qIndex] === oIndex &&
                                oIndex !== question.correctAnswer &&
                                " (Your answer)"}
                            </p>
                          ))}
                        </div>
                        {/* Explanation box — only shown if the AI provided one */}
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

            {/* Retake and back buttons */}
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

  // — ACTIVE QUIZ SCREEN — Question-by-question answering
  const currentQuestion = quiz.questions[currentIndex]
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100         // % of questions reached
  const answeredCount = selectedAnswers.filter((a) => a !== null).length       // How many answered so far

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* — QUIZ HEADER — Title, progress text, and answered badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quizzes" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{quiz.name}</h1>
            <p className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {quiz.questions.length}  {/* 1-based display */}
            </p>
          </div>
        </div>
        {/* Badge showing X/Y answered — helps user track completion before submitting */}
        <Badge variant="outline">
          {answeredCount}/{quiz.questions.length} answered
        </Badge>
      </div>

      {/* Progress bar: fills as user advances through questions */}
      <Progress value={progress} className="h-2" />

      {/* — QUESTION CARD — Shows question text and selectable options */}
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
                  ? "border-primary bg-primary/5"  // Selected option: primary border + tinted bg
                  : "border-border hover:bg-muted"  // Unselected: standard border with hover highlight
              }`}
            >
              {/* A/B/C/D prefix using ASCII offset (65 = 'A') */}
              <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* — NAVIGATION FOOTER — Previous/Next buttons + dot tracker + Submit */}
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        {/* Previous: disabled on first question */}
        <Button variant="outline" onClick={prevQuestion} disabled={currentIndex === 0}>
          Previous
        </Button>

        {/* Dot navigation: click any dot to jump to that question */}
        <div className="flex gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                currentIndex === index
                  ? "bg-primary"        // Current question: fully filled
                  : selectedAnswers[index] !== null
                  ? "bg-primary/50"     // Answered but not current: half opacity
                  : "bg-muted"          // Unanswered: muted/grey
              }`}
            />
          ))}
        </div>

        {/* Next on all questions except the last; Submit on the last (disabled until all answered) */}
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
