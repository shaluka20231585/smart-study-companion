"use client"

import { Spinner } from "@/components/ui/spinner"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import {
  getDocumentById,
  getDocumentContent,
  createDocumentContent,
  updateDocument,
  getFlashcardDecksByDocument,
  getQuizzesByDocument,
  getQuizAttemptsByDocument,
} from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Brain,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  BookOpen,
  Sparkles,
  Loader2,
  Trophy,
  TrendingUp,
  CheckCircle,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { Document } from "@/lib/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const { user } = useAuth()
  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [flashcardCount, setFlashcardCount] = useState(0)
  const [quizCount, setQuizCount] = useState(0)
  const [quizAttempts, setQuizAttempts] = useState<any[]>([])

  useEffect(() => {
    async function fetchDocument() {
      if (!user || !id) return

      try {
        const doc = await getDocumentById(id, user.id)

        if (doc) {
          setDocument(doc as Document)

          // Fetch extracted content if available
          try {
            const content = await getDocumentContent(id)
            if (content) {
              setContent(content.text || "")
            }
          } catch {
            // Content might not exist yet
          }

          // Fetch flashcard and quiz counts
          const flashcards = await getFlashcardDecksByDocument(id)
          setFlashcardCount(flashcards?.length || 0)

          const quizzes = await getQuizzesByDocument(id)
          setQuizCount(quizzes?.length || 0)

          // Fetch quiz attempts for performance tracking
          const attempts = await getQuizAttemptsByDocument(id)
          setQuizAttempts(attempts || [])
        } else {
          toast.error("Document not found")
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

  const extractTextFromPDF = async () => {
    if (!document?.fileUrl) return

    setProcessing(true)
    try {
      // Get the file path from the document's fileUrl
      const urlParts = document.fileUrl.split('/documents/')[1] // Gets the path after /documents/
      
      const response = await fetch("/api/documents/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          documentId: id,
          userId: user?.id,
          filePath: urlParts, // e.g., "user-id/doc-id/filename.pdf"
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to extract text")
      }

      const { text, pageCount } = await response.json()
      
      // Save extracted content to Supabase
      await createDocumentContent(id, {
        text,
        extracted_at: new Date().toISOString(),
      })

      // Update document status
      await updateDocument(id, {
        status: "ready",
        page_count: pageCount,
        processed_at: new Date().toISOString(),
      })

      setContent(text)
      setDocument((prev) => prev ? { ...prev, status: "ready", page_count: pageCount } : null)
      toast.success("Document processed successfully")
    } catch (error) {
      console.error("Error extracting text:", error)
      toast.error("Failed to process document. Please try again.")
      
      await updateDocument(id, {
        status: "error",
        error_message: "Text extraction failed",
      })
    } finally {
      setProcessing(false)
    }
  }

  const reExtractDocument = async () => {
    if (!document?.fileUrl || !user) return

    setProcessing(true)
    toast.info("Re-extracting document with improved text extraction...")
    
    try {
      const response = await fetch(`/api/documents/${id}/reextract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to re-extract document")
      }

      const result = await response.json()
      
      toast.success("Document re-extracted successfully! Refresh the page to see updated content.")
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error) {
      console.error("Error re-extracting document:", error)
      toast.error(error instanceof Error ? error.message : "Failed to re-extract document")
    } finally {
      setProcessing(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!document) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/documents" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Link>
        <Card className="py-16">
          <CardContent className="text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Document not found</h3>
            <p className="mt-2 text-muted-foreground">
              This document may have been deleted or you don&apos;t have access to it.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center gap-4">
        <Link href="/documents" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{document.name}</h1>
          <p className="text-muted-foreground">
            Uploaded {document.uploadedAt?.toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={
                  document.status === "ready"
                    ? "default"
                    : document.status === "processing"
                    ? "secondary"
                    : "destructive"
                }
                className={document.status === "ready" ? "bg-emerald-500" : ""}
              >
                {document.status === "ready" ? "Ready" : document.status === "processing" ? "Processing" : "Error"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Size</span>
              <span className="text-sm">{formatFileSize(document.fileSize)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pages</span>
              <span className="text-sm">{document.pageCount || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Flashcard Decks</span>
              <span className="text-sm">{flashcardCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quizzes</span>
              <span className="text-sm">{quizCount}</span>
            </div>

            {document.status === "processing" || document.status === "uploading" ? (
              <Button
                onClick={extractTextFromPDF}
                disabled={processing}
                className="w-full gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Process Document
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={reExtractDocument}
                disabled={processing}
                variant="outline"
                className="w-full gap-2 border-purple-300 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-950"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Re-extracting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Re-Extract Text
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Study Tools
            </CardTitle>
            <CardDescription>
              Generate AI-powered study materials from this document
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Link href={`/documents/${id}/flashcards`}>
              <Button
                variant="outline"
                className="w-full h-auto py-6 flex-col gap-2 bg-transparent"
                disabled={document.status !== "ready"}
              >
                <Brain className="h-8 w-8 text-emerald-600" />
                <span className="font-semibold">Generate Flashcards</span>
                <span className="text-xs text-muted-foreground">
                  Create AI-powered flashcards
                </span>
              </Button>
            </Link>
            <Link href={`/documents/${id}/quiz`}>
              <Button
                variant="outline"
                className="w-full h-auto py-6 flex-col gap-2 bg-transparent"
                disabled={document.status !== "ready"}
              >
                <HelpCircle className="h-8 w-8 text-amber-600" />
                <span className="font-semibold">Generate Quiz</span>
                <span className="text-xs text-muted-foreground">
                  Test your knowledge
                </span>
              </Button>
            </Link>
            <Link href={`/chat?document=${id}`}>
              <Button
                variant="outline"
                className="w-full h-auto py-6 flex-col gap-2 bg-transparent"
                disabled={document.status !== "ready"}
              >
                <MessageSquare className="h-8 w-8 text-blue-600" />
                <span className="font-semibold">Chat with AI Tutor</span>
                <span className="text-xs text-muted-foreground">
                  Ask questions about this document
                </span>
              </Button>
            </Link>
            <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                className="w-full h-auto py-6 flex-col gap-2 bg-transparent"
              >
                <BookOpen className="h-8 w-8 text-rose-600" />
                <span className="font-semibold">View Original PDF</span>
                <span className="text-xs text-muted-foreground">
                  Open in new tab
                </span>
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Quiz Performance Section */}
      {quizCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Quiz Performance
            </CardTitle>
            <CardDescription>
              Track your progress across quizzes for this document
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quizAttempts.length > 0 ? (
              <div className="space-y-4">
                {/* Performance Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-bold mt-2">{quizAttempts.length}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold mt-2">
                      {Math.round(
                        quizAttempts.reduce((sum, a) => sum + (a.score / a.total_questions * 100), 0) / quizAttempts.length
                      )}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Best Score</p>
                    <p className="text-2xl font-bold mt-2">
                      {Math.round(
                        Math.max(...quizAttempts.map(a => a.score / a.total_questions * 100))
                      )}%
                    </p>
                  </div>
                </div>

                {/* Recent Attempts */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Recent Attempts
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {quizAttempts.slice(0, 10).map((attempt, index) => {
                      const percentage = Math.round((attempt.score / attempt.total_questions) * 100)
                      return (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              percentage >= 80 ? 'bg-emerald-100' : percentage >= 60 ? 'bg-amber-100' : 'bg-rose-100'
                            }`}>
                              {percentage >= 80 ? (
                                <CheckCircle className={`h-4 w-4 ${percentage >= 80 ? 'text-emerald-600' : ''}`} />
                              ) : (
                                <span className={`text-xs font-bold ${
                                  percentage >= 60 ? 'text-amber-600' : 'text-rose-600'
                                }`}>{percentage}%</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {attempt.score}/{attempt.total_questions} correct
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(attempt.completed_at).toLocaleDateString()} {new Date(attempt.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{percentage}%</p>
                            <p className="text-xs text-muted-foreground">{Math.round(attempt.time_taken / 60)}m</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No quiz attempts yet</p>
                <p className="text-sm text-muted-foreground mt-1">Take a quiz to see your performance here</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Preview */}
      {content && (
        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
            <CardDescription>Extracted text from your document</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="full">Full Text</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" className="mt-4">
                <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed">
                  {content.slice(0, 1500)}
                  {content.length > 1500 && "..."}
                </div>
              </TabsContent>
              <TabsContent value="full" className="mt-4">
                <div className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
