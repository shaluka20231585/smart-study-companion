"use client"

import { Spinner } from "@/components/ui/spinner"
import { ThreeBodyLoader } from "@/components/ui/three-body-loader"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getDocumentById, getDocumentContent, getDocumentTextFromChunks, createQuiz, createQuizQuestions } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, HelpCircle, Sparkles, Save, Eye, Loader2, Play } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Document, QuizQuestion } from "@/lib/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function GenerateQuizPage({ params }: PageProps) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [quizName, setQuizName] = useState("")
  const [questionCount, setQuestionCount] = useState(10)
  const [previewIndex, setPreviewIndex] = useState(0)

  useEffect(() => {
    async function fetchDocument() {
      if (!user || !id) return

      try {
        const docData = await getDocumentById(id, user.id)

        if (docData) {
          setDocument(docData as Document)
          setQuizName(`${docData.name} - Quiz`)

          // Fetch extracted content from chunks
          try {
            const textFromChunks = await getDocumentTextFromChunks(id)
            if (textFromChunks) {
              setContent(textFromChunks)
            } else {
              // Try legacy document_contents table
              try {
                const contentData = await getDocumentContent(id)
                if (contentData) {
                  setContent(contentData.text || "")
                }
              } catch {
                // Content might not exist yet
              }
            }
          } catch {
            // Chunks table might not exist yet
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

  const generateQuiz = async () => {
    if (!content) {
      toast.error("No content available. Please process the document first.")
      return
    }

    // Log content length for debugging
    console.log("Content length:", content.length)
    console.log("Content preview:", content.substring(0, 500))

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
          documentName: document?.name || "document"
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate quiz")
      }

      const data = await response.json()
      
      // Validate questions have actual content
      if (!data.questions || data.questions.length === 0) {
        throw new Error("No questions were generated. Please try again.")
      }

      // Add IDs to questions
      const questionsWithIds = data.questions.map((q: QuizQuestion, i: number) => ({
        ...q,
        id: `q-${i}`,
      }))
      
      console.log("Generated questions:", questionsWithIds)
      setQuestions(questionsWithIds)
      setPreviewIndex(0)
      toast.success(`Generated ${data.questions.length} questions`)
    } catch (error) {
      console.error("Error generating quiz:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate quiz. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

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

      const newQuiz = await createQuiz({
        user_id: user.id,
        document_id: id,
        name: quizName,
        question_count: questionsToSave.length,
        created_at: new Date().toISOString(),
      })

      if (!newQuiz || !newQuiz.id) {
        throw new Error("Failed to create quiz - no ID returned from database")
      }

      console.log("Quiz created successfully:", newQuiz.id)

      const quizQuestions = questionsToSave.map((q, idx) => ({
        quiz_id: newQuiz.id,
        question: q.question,
        options: q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation || "",
        order: idx,
      }))

      console.log("Saving quiz questions...", { count: quizQuestions.length })

      await createQuizQuestions(quizQuestions)

      console.log("Quiz questions saved successfully")
      
      return newQuiz
    } catch (error) {
      console.error("Error saving quiz:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : undefined,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })
      throw error
    }
  }

  const handleAttemptQuiz = async () => {
    if (!questions.length || !quizName.trim()) {
      toast.error("Please generate a quiz first")
      return
    }

    setSaving(true)
    try {
      const newQuiz = await saveQuizToDatabase(questions)
      toast.success("Quiz saved! Starting quiz...")
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

  const autoSaveQuiz = async (questionsToSave: QuizQuestion[]) => {
    if (!user || !questionsToSave.length || !quizName.trim()) {
      console.error("Cannot auto-save: Missing user, questions, or quiz name", {
        hasUser: !!user,
        questionCount: questionsToSave.length,
        quizName: quizName.trim(),
      })
      return
    }

    try {
      console.log("Auto-saving quiz...", { quizName, questionCount: questionsToSave.length })

      const newQuiz = await createQuiz({
        user_id: user.id,
        document_id: id,
        name: quizName,
        question_count: questionsToSave.length,
        created_at: new Date().toISOString(),
      })

      if (!newQuiz || !newQuiz.id) {
        throw new Error("Failed to create quiz - no ID returned from database")
      }

      console.log("Quiz created successfully:", newQuiz.id)

      const quizQuestions = questionsToSave.map((q, idx) => ({
        quiz_id: newQuiz.id,
        question: q.question,
        options: q.options,
        correct_answer: q.correctAnswer,
        explanation: q.explanation || "",
        order: idx,
      }))

      console.log("Saving quiz questions...", { count: quizQuestions.length })

      await createQuizQuestions(quizQuestions)

      console.log("Quiz questions saved successfully")

      toast.success("Quiz saved! Redirecting to take the quiz...")
      setTimeout(() => {
        router.push(`/quizzes/${newQuiz.id}`)
      }, 1500)
    } catch (error) {
      console.error("Error auto-saving quiz:", {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      })
      toast.error("Failed to save quiz. Please try again or contact support.")
    }
  }

  const handleSaveQuiz = async () => {
    if (!questions.length || !quizName.trim()) {
      toast.error("Please generate a quiz first")
      return
    }

    setSaving(true)
    try {
      await saveQuizToDatabase(questions)
      toast.success("Quiz saved successfully!")
      // Reset form after successful save
      setQuestions([])
      setQuizName(`${document?.name} - Quiz`)
    } catch (error) {
      console.error("Error saving quiz:", error)
      toast.error("Failed to save quiz. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center gap-4">
        <Link href={`/documents/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Quiz</h1>
          <p className="text-muted-foreground">{document?.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generation Settings
            </CardTitle>
            <CardDescription>Configure your quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="quizName">Quiz Name</Label>
              <Input
                id="quizName"
                value={quizName}
                onChange={(e) => setQuizName(e.target.value)}
                placeholder="Enter quiz name"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Number of Questions</Label>
                <span className="text-sm font-medium">{questionCount}</span>
              </div>
              <Slider
                value={[questionCount]}
                onValueChange={([value]) => setQuestionCount(value)}
                min={5}
                max={20}
                step={5}
              />
            </div>
            <Button
              onClick={generateQuiz}
              disabled={generating || !content}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {generating ? (
                <>
                  <ThreeBodyLoader size={20} color="#ffffff" />
                  <span className="ml-2">Generating Quiz...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </Button>
            {!content && (
              <p className="text-sm text-muted-foreground text-center">
                Document needs to be processed first
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              {questions.length > 0
                ? `Question ${previewIndex + 1} of ${questions.length}`
                : "Generate a quiz to preview"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generating ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6">
                <ThreeBodyLoader size={50} color="#5D3FD3" />
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-purple-600 dark:text-purple-400">Generating Your Quiz</p>
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing your document and creating {questionCount} tailored questions...
                  </p>
                </div>
              </div>
            ) : questions.length > 0 ? (
              <div className="space-y-4">
                <div className="min-h-48 rounded-lg border border-border p-4 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
                  <p className="font-medium mb-4">{questions[previewIndex].question}</p>
                  <div className="space-y-2">
                    {questions[previewIndex].options.map((option, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border border-border bg-background/60 hover:bg-accent/50 transition-colors`}
                      >
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>
                  {questions[previewIndex].explanation && (
                    <div className="mt-4 p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">Explanation</p>
                      <p className="text-sm">{questions[previewIndex].explanation}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                    disabled={previewIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPreviewIndex((i) => Math.min(questions.length - 1, i + 1))}
                    disabled={previewIndex === questions.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
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

      {/* Save/Action Card */}
      {questions.length > 0 && (
        <Card className="border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
          <CardContent className="space-y-4 py-6">
            <div className="text-center">
              <p className="font-semibold text-xl text-purple-700 dark:text-purple-300">{questions.length} questions generated</p>
              <p className="text-sm text-muted-foreground mt-1">Ready to save and take your personalized quiz</p>
            </div>
            <div className="flex gap-3">
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
              <Button 
                onClick={handleSaveQuiz} 
                disabled={saving}
                variant="outline"
                className="flex-1 gap-2 border-2 hover:bg-accent shadow-md"
              >
                {saving ? (
                  <>
                    <ThreeBodyLoader size={16} color="#5D3FD3" />
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
            <p className="text-xs text-muted-foreground text-center bg-background/60 p-2 rounded">
              Both options will save the quiz to your quizzes section. "Attempt Quiz" will start the quiz immediately.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
