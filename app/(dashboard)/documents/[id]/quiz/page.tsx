// Client Component — required for hooks, form state, and API calls
"use client"

// Spinner / ThreeBodyLoader: Custom loading animations used in place of Loader2
import { Spinner } from "@/components/ui/spinner"
import { ThreeBodyLoader } from "@/components/ui/three-body-loader"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"

// Query helpers: load document content, save quiz and questions to DB
import { getDocumentById, getDocumentContent, getDocumentTextFromChunks, createQuiz, createQuizQuestions } from "@/lib/queries"
// getDocumentTextFromChunks — primary (higher quality) content source
// getDocumentContent — legacy fallback
// createQuiz — inserts the quiz metadata row
// createQuizQuestions — bulk-inserts all question rows

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"    // Quiz name text field
import { Label } from "@/components/ui/label"    // Accessible form labels
import { Slider } from "@/components/ui/slider"  // Question count slider (5–20)
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, HelpCircle, Sparkles, Save, Eye, Loader2, Play } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation" // Used for redirect after saving
import type { Document, QuizQuestion } from "@/lib/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function GenerateQuizPage({ params }: PageProps) {
  const { id } = use(params) // Unwrap params Promise with React's `use()`
  const { user } = useAuth()
  const router = useRouter()

  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState<string>("")    // Extracted text to send to AI
  const [loading, setLoading] = useState(true)           // Page-level loading state
  const [generating, setGenerating] = useState(false)    // AI generation in progress
  const [saving, setSaving] = useState(false)            // DB save in progress

  // questions: AI-generated quiz questions before the user saves
  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  // quizName: Pre-filled with "<document name> - Quiz", user can edit
  const [quizName, setQuizName] = useState("")

  // questionCount: How many questions to request from the AI (5–20)
  const [questionCount, setQuestionCount] = useState(10)

  // previewIndex: Which question is currently visible in the right panel
  const [previewIndex, setPreviewIndex] = useState(0)

  // Fetch document info and content once after mount
  useEffect(() => {
    async function fetchDocument() {
      if (!user || !id) return

      try {
        const docData = await getDocumentById(id, user.id)

        if (docData) {
          setDocument(docData as Document)
          setQuizName(`${docData.name} - Quiz`) // Default quiz name

          // Try chunk-based content first (better quality for long docs)
          try {
            const textFromChunks = await getDocumentTextFromChunks(id)
            if (textFromChunks) {
              setContent(textFromChunks)
            } else {
              // Fall back to legacy document_contents table
              try {
                const contentData = await getDocumentContent(id)
                if (contentData) {
                  setContent(contentData.text || "")
                }
              } catch {
                // Silently ignore — no content yet
              }
            }
          } catch {
            // Silently ignore — chunks table may not exist in older deployments
          }
        }
      } catch (error) {
        console.error("Error fetching document:", error)
        toast.error("Failed to load document")
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [user, id])

  /**
   * generateQuiz — Calls the /api/quiz/generate endpoint with the document content
   * Adds temporary IDs to each question and populates the questions state
   */
  const generateQuiz = async () => {
    if (!content) {
      toast.error("No content available. Please process the document first.")
      return
    }

    // Debug logs help diagnose empty-content issues in production
    console.log("Content length:", content.length)
    console.log("Content preview:", content.substring(0, 500))

    // Guard against extremely short content (very likely a scanned/image PDF)
    if (content.length < 500) {
      toast.error("Document content is too short. Please upload a more detailed document.")
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content, 
          count: questionCount,
          documentName: document?.name || "document" // Used in AI prompt for context
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate quiz")
      }

      const data = await response.json()
      
      // Extra validation — AI might return an empty array in edge cases
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions were generated. Please try again.")
      }

      // Attach temporary client-side IDs so React can key the list correctly
      const questionsWithIds = data.questions.map((q: QuizQuestion, i: number) => ({
        ...q,
        id: `q-${i}`,
      }))
      
      console.log("Generated questions:", questionsWithIds)
      setQuestions(questionsWithIds)
      setPreviewIndex(0) // Reset to first question in preview
      toast.success(`Generated ${data.questions.length} questions`)
    } catch (error) {
      console.error("Error generating quiz:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate quiz. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  /**
   * saveQuizToDatabase — Persists the quiz and its questions to Supabase
   * 1. Creates the quiz metadata row (name, question count, document link)
   * 2. Bulk-inserts all question rows with the new quiz's ID
   * Returns the created quiz row (for redirect)
   */
  const saveQuizToDatabase = async (questionsToSave: QuizQuestion[]) => {
    if (!user || !questionsToSave.length || !quizName.trim()) {
      console.error("Cannot save: Missing user, questions, or quiz name", {
        hasUser: !!user,
        questionCount: questionsToSave.length,
        quizName: quizName.trim(),
      })
      throw new Error("Missing required information to save quiz")
    }

    try {
      console.log("Saving quiz to database...", { quizName, questionCount: questionsToSave.length })

      // Step 1: Create the parent quiz row
      const newQuiz = await createQuiz({
        user_id:        user.id,
        document_id:    id,
        name:           quizName,
        question_count: questionsToSave.length, // Denormalized for list display
        created_at:     new Date().toISOString(),
      })

      if (!newQuiz || !newQuiz.id) {
        throw new Error("Failed to create quiz - no ID returned from database")
      }

      console.log("Quiz created successfully:", newQuiz.id)

      // Step 2: Build question rows, preserving display order via `order` field
      const quizQuestions = questionsToSave.map((q, idx) => ({
        quiz_id:       newQuiz.id,
        question:      q.question,
        options:       q.options,
        correct_answer: q.correctAnswer,
        explanation:   q.explanation || "",
        order:         idx,
      }))

      console.log("Saving quiz questions...", { count: quizQuestions.length })

      await createQuizQuestions(quizQuestions) // Batch insert

      console.log("Quiz questions saved successfully")
      
      return newQuiz
    } catch (error) {
      // Log all available error details for debugging Supabase/network issues
      console.error("Error saving quiz:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack:   error instanceof Error ? error.stack : undefined,
        errorName:    error instanceof Error ? error.name : undefined,
        fullError:    JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })
      throw error
    }
  }

  /**
   * handleAttemptQuiz — Saves the quiz then immediately navigates to the take-quiz page
   * Used by the "Attempt Quiz" primary CTA button
   */
  const handleAttemptQuiz = async () => {
    if (!questions.length || !quizName.trim()) {
      toast.error("Please generate a quiz first")
      return
    }

    setSaving(true)
    try {
      const newQuiz = await saveQuizToDatabase(questions)
      toast.success("Quiz saved! Starting quiz...")
      // Short delay before redirect so the user sees the success toast
      setTimeout(() => {
        router.push(`/quizzes/${newQuiz.id}`)
      }, 800)
    } catch (error) {
      console.error("Error attempting quiz:", error)
      toast.error("Failed to save and start quiz. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  /**
   * autoSaveQuiz — Saves the quiz and redirects after 1.5 seconds
   * (Legacy function — similar to handleAttemptQuiz but with a longer delay)
   */
  const autoSaveQuiz = async (questionsToSave: QuizQuestion[]) => {
    if (!user || !questionsToSave.length || !quizName.trim()) {
      console.error("Cannot auto-save: Missing user, questions, or quiz name", {
        hasUser:       !!user,
        questionCount: questionsToSave.length,
        quizName:      quizName.trim(),
      })
      return
    }

    try {
      console.log("Auto-saving quiz...", { quizName, questionCount: questionsToSave.length })

      const newQuiz = await createQuiz({
        user_id:        user.id,
        document_id:    id,
        name:           quizName,
        question_count: questionsToSave.length,
        created_at:     new Date().toISOString(),
      })

      if (!newQuiz || !newQuiz.id) {
        throw new Error("Failed to create quiz - no ID returned from database")
      }

      console.log("Quiz created successfully:", newQuiz.id)

      const quizQuestions = questionsToSave.map((q, idx) => ({
        quiz_id:        newQuiz.id,
        question:       q.question,
        options:        q.options,
        correct_answer: q.correctAnswer,
        explanation:    q.explanation || "",
        order:          idx,
      }))

      console.log("Saving quiz questions...", { count: quizQuestions.length })

      await createQuizQuestions(quizQuestions)

      console.log("Quiz questions saved successfully")

      toast.success("Quiz saved! Redirecting to take the quiz...")
      setTimeout(() => {
        router.push(`/quizzes/${newQuiz.id}`)
      }, 1500) // Slightly longer delay than handleAttemptQuiz
    } catch (error) {
      console.error("Error auto-saving quiz:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack:   error instanceof Error ? error.stack : undefined,
      })
      toast.error("Failed to save quiz. Please try again or contact support.")
    }
  }

  /**
   * handleSaveQuiz — Saves the quiz without navigating away
   * Resets the form after a successful save so the user can generate another
   */
  const handleSaveQuiz = async () => {
    if (!questions.length || !quizName.trim()) {
      toast.error("Please generate a quiz first")
      return
    }

    setSaving(true)
    try {
      await saveQuizToDatabase(questions)
      toast.success("Quiz saved successfully!")
      setQuestions([])                              // Clear generated questions
      setQuizName(`${document?.name} - Quiz`)       // Reset name to default
    } catch (error) {
      console.error("Error saving quiz:", error)
      toast.error("Failed to save quiz. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // — LOADING STATE — Skeleton placeholders while document data fetches
  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />    {/* Header placeholder */}
        <Skeleton className="h-64 w-full" /> {/* Content placeholder */}
      </div>
    )
  }

  // — MAIN VIEW —
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* — PAGE HEADER — Back arrow + "Generate Quiz" title + document name as subtitle */}
      <div className="flex items-center gap-4">
        <Link href={`/documents/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Quiz</h1>
          <p className="text-muted-foreground">{document?.name}</p>  {/* Source document subtitle */}
        </div>
      </div>

      {/* — 2-COLUMN GRID — Generation Settings (left) + Preview (right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* — GENERATION SETTINGS CARD — Quiz name, question count slider, generate button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generation Settings
            </CardTitle>
            <CardDescription>Configure your quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quiz name input — pre-filled with "<docName> - Quiz" in useEffect */}
            <div className="space-y-2">
              <Label htmlFor="quizName">Quiz Name</Label>
              <Input
                id="quizName"
                value={quizName}
                onChange={(e) => setQuizName(e.target.value)}
                placeholder="Enter quiz name"
              />
            </div>
            {/* Question count: label + live value + Slider (5–20, step 5) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Number of Questions</Label>
                <span className="text-sm font-medium">{questionCount}</span>  {/* Live display */}
              </div>
              <Slider
                value={[questionCount]}
                onValueChange={([value]) => setQuestionCount(value)}
                min={5}
                max={20}
                step={5}
              />
            </div>
            {/* Generate button: purple-to-blue gradient; shows ThreeBodyLoader while generating */}
            <Button
              onClick={generateQuiz}
              disabled={generating || !content}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {generating ? (
                <>
                  <ThreeBodyLoader size={20} color="#ffffff" />  {/* White spinner on gradient bg */}
                  <span className="ml-2">Generating Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </Button>
            {/* Warning shown if document hasn't been processed (no extracted text) */}
            {!content && (
              <p className="text-sm text-muted-foreground text-center">
                Document needs to be processed first
              </p>
            )}
          </CardContent>
        </Card>

        {/* — PREVIEW CARD — Shows a single question at a time from the generated list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
            {/* Subtitle shows position once questions exist */}
            <CardDescription>
              {questions.length > 0
                ? `Question ${previewIndex + 1} of ${questions.length}`
                : "Generate a quiz to preview"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generating ? (
              // — GENERATING STATE — Full-height loader with explanatory text
              <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
                <ThreeBodyLoader size={50} color="#5D3FD3" />  {/* Large purple spinner */}
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-purple-600 dark:text-purple-400">Generating Your Quiz</p>
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing your document and creating {questionCount} tailored questions...
                  </p>
                </div>
              </div>
            ) : questions.length > 0 ? (
              // — QUESTIONS PREVIEW — One question card with A/B/C/D options
              <div className="space-y-4">
                {/* Gradient card with subtle purple-to-blue tint */}
                <div className="min-h-48 rounded-lg border border-border p-4 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
                  <p className="font-medium mb-4">{questions[previewIndex].question}</p>
                  <div className="space-y-2">
                    {questions[previewIndex].options.map((option, i) => (
                      // Each option displayed as a non-interactive row (preview only, no selection)
                      <div
                        key={i}
                        className={`p-3 rounded-lg border border-border bg-background/60 hover:bg-accent/50 transition-colors`}
                      >
                        {/* A/B/C/D label: charCode 65='A', 66='B', etc. */}
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>
                  {/* Explanation box — shown below options if available */}
                  {questions[previewIndex].explanation && (
                    <div className="mt-4 p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">Explanation</p>
                      <p className="text-sm">{questions[previewIndex].explanation}</p>
                    </div>
                  )}
                </div>
                {/* Previous / Next navigation through preview questions */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                    disabled={previewIndex === 0}                          // Disabled at first question
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPreviewIndex((i) => Math.min(questions.length - 1, i + 1))}
                    disabled={previewIndex === questions.length - 1}       // Disabled at last question
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              // Placeholder before any questions are generated
              <div className="min-h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <HelpCircle className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-4">No questions generated yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* — SAVE / ACTION CARD — Only rendered once questions have been generated */}
      {questions.length > 0 && (
        // Purple-bordered gradient card signals that the quiz is ready to act on
        <Card className="border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardContent className="space-y-4 py-6">
            <div className="text-center">
              <p className="font-semibold text-xl text-purple-700 dark:text-purple-300">{questions.length} questions generated</p>
              <p className="text-sm text-muted-foreground mt-1">Ready to save and take your personalized quiz</p>
            </div>
            <div className="flex gap-3">
              {/* Attempt Quiz: saves to DB then immediately navigates to the quiz attempt page */}
              <Button 
                onClick={handleAttemptQuiz} 
                disabled={saving}
                className="flex-1 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
              >
                {saving ? (
                  <>
                    <ThreeBodyLoader size={16} color="#ffffff" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Attempt Quiz
                  </>
                )}
              </Button>
              {/* Save Quiz: saves to DB without navigating — resets form for another generation */}
              <Button 
                onClick={handleSaveQuiz} 
                disabled={saving}
                variant="outline"
                className="flex-1 gap-2 border-2 hover:bg-accent shadow-md"
              >
                {saving ? (
                  <>
                    <ThreeBodyLoader size={16} color="#5D3FD3" />  {/* Purple spinner on outline bg */}
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Quiz
                  </>
                )}
              </Button>
            </div>
            {/* Clarifying note: both buttons save; difference is whether quiz starts immediately */}
            <p className="text-xs text-muted-foreground text-center bg-background/60 p-2 rounded">
              Both options will save the quiz to your quizzes section. "Attempt Quiz" will start the quiz immediately.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
