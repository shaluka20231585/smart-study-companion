// Client Component — required for hooks and event handlers
"use client"

// Spinner: imported but Loader2 is used instead (unused import)
import { Spinner } from "@/components/ui/spinner"

// useEffect: Fetches document data after mount
// useState: Holds document, content, and processing flags
// use: Unwraps the params Promise from Next.js 15+
import { useEffect, useState, use } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase" // Direct Supabase client (not used directly here, but available)

// Query helpers for loading and updating document data
import {
  getDocumentById,             // Fetch one document by ID
  getDocumentTextFromChunks,   // Reconstruct text from chunks (primary source)
  createDocumentContent,       // Save extracted text to document_contents table
  updateDocument,              // Update document status/metadata
  getFlashcardDecksByDocument, // Count flashcard decks linked to this document
  getQuizzesByDocument,        // Count quizzes linked to this document
  getQuizAttemptsByDocument,   // Load all quiz attempts for performance tracking
} from "@/lib/queries"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"       // Status badge (Ready / Processing / Error)
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Content preview tabs

// Icon imports
import {
  FileText,     // Document icon and back-link fallback
  Brain,        // Generate Flashcards button
  HelpCircle,   // Generate Quiz button and empty quiz state
  MessageSquare,// Chat with AI Tutor button
  ArrowLeft,    // Back navigation
  RefreshCw,    // Process Document / Re-Extract Text button
  BookOpen,     // View Original PDF button
  Sparkles,     // Study Tools card heading
  Loader2,      // Animated spinner during processing
  Trophy,       // Quiz performance section
  TrendingUp,   // Recent Attempts section heading
  CheckCircle,  // High-score result indicator in attempts list
  Wand2,        // AI Summarize button icon
} from "lucide-react"

import { toast } from "sonner"
import Link from "next/link"
import type { Document } from "@/lib/types"

// PageProps — params is a Promise in Next.js 15+
interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentDetailPage({ params }: PageProps) {
  const { id } = use(params)     // Unwrap params Promise using React's `use()` hook
  const { user } = useAuth()

  // document: Full metadata for the current document
  const [document, setDocument] = useState<Document | null>(null)

  // content: Extracted plain text from the PDF — shown in the preview tab
  const [content, setContent] = useState<string>("")

  const [loading, setLoading] = useState(true)

  // processing: True while extract/re-extract API calls are in progress
  const [processing, setProcessing] = useState(false)

  // flashcardCount / quizCount: Shown in the Document Info sidebar
  const [flashcardCount, setFlashcardCount] = useState(0)
  const [quizCount, setQuizCount] = useState(0)

  // quizAttempts: Raw attempt rows used to build the performance section
  const [quizAttempts, setQuizAttempts] = useState<any[]>([])

  // Summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summary, setSummary] = useState<string>("")
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Fetch document data once after mount
  useEffect(() => {
    async function fetchDocument() {
      if (!user || !id) return

      try {
        // Load document metadata (validates this user owns it)
        const doc = await getDocumentById(id, user.id)

        if (doc) {
          setDocument(doc as Document)

          // Attempt to load the extracted text from chunks (primary source)
          try {
            const fullText = await getDocumentTextFromChunks(id)
            if (fullText) {
              setContent(fullText)
            }
          } catch (error) {
            console.error("Error fetching document chunks:", error)
            // Silently ignore — chunks may not exist yet for new documents
          }

          // Load flashcard deck count for the sidebar info card
          const flashcards = await getFlashcardDecksByDocument(id)
          setFlashcardCount(flashcards?.length || 0)

          // Load quiz count for the sidebar info card
          const quizzes = await getQuizzesByDocument(id)
          setQuizCount(quizzes?.length || 0)

          // Load quiz attempts for the performance section
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

  /**
   * extractTextFromPDF — Triggers the /api/documents/extract endpoint for a not-yet-processed document
   * Saves the extracted text to document_contents and updates the document status to "ready"
   */
  const extractTextFromPDF = async () => {
    if (!document?.fileUrl) return

    setProcessing(true)
    try {
      // Extract the storage path from the full public URL
      // E.g. "https://.../documents/user-id/doc-id/file.pdf" → "user-id/doc-id/file.pdf"
      const urlParts = document.fileUrl.split('/documents/')[1]
      
      const response = await fetch("/api/documents/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          documentId: id,
          userId: user?.id,
          filePath: urlParts, // e.g. "user-id/doc-id/filename.pdf"
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to extract text")
      }

      const { text, pageCount } = await response.json()
      
      // Save the extracted text so future visits don't need to re-extract
      await createDocumentContent(id, {
        text,
        extracted_at: new Date().toISOString(),
      })

      // Update document status to "ready" and record page count
      await updateDocument(id, {
        status: "ready",
        page_count: pageCount,
        processed_at: new Date().toISOString(),
      })

      setContent(text) // Update preview
      // Update local document state without a full refetch
      setDocument((prev) => prev ? { ...prev, status: "ready", page_count: pageCount } : null)
      toast.success("Document processed successfully")
    } catch (error) {
      console.error("Error extracting text:", error)
      toast.error("Failed to process document. Please try again.")
      
      // Record the failure in the DB so the UI shows an error badge
      await updateDocument(id, {
        status: "error",
        error_message: "Text extraction failed",
      })
    } finally {
      setProcessing(false)
    }
  }

  /**
   * reExtractDocument — Re-runs text extraction on an already-processed document
   * Calls a dedicated reextract endpoint then reloads the page after 1.5s
   */
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
      
      // Force a full page reload after a short delay so all data is fresh
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

  /**
   * handleSummarize — Calls the AI summarizer API and displays the summary in a modal
   */
  const handleSummarize = async () => {
    if (!content) {
      toast.error("No document content to summarize")
      return
    }

    setSummaryLoading(true)
    setSummary("")
    setShowSummaryModal(true)

    try {
      const response = await fetch("/api/documents/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContent: content,
          documentName: document?.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate summary")
      }

      // Parse the JSON response
      const data = await response.json()
      setSummary(data.summary)
      toast.success("Summary generated successfully")
    } catch (error) {
      console.error("Error generating summary:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate summary. Please try again.")
      setShowSummaryModal(false)
    } finally {
      setSummaryLoading(false)
    }
  }

  /**
   * formatFileSize — Converts raw byte count to human-readable string
   * e.g. 1500000 bytes → "1.4 MB"
   */
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024)             return `${bytes} B`
    if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />    {/* Header placeholder */}
        <Skeleton className="h-48 w-full" /> {/* Content placeholder */}
      </div>
    )
  }

  // — NOT FOUND STATE — Document deleted or RLS denied access
  if (!document) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Back navigation */}
        <Link href="/documents" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Link>
        {/* Centred empty state with FileText icon */}
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

  // — MAIN VIEW —
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* — PAGE HEADER — Document name and upload date */}
      <div className="flex items-center gap-4">
        <Link href="/documents" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{document.name}</h1>
          <p className="text-muted-foreground">
            Uploaded {document.uploadedAt?.toLocaleDateString()}  {/* Locale-formatted date */}
          </p>
        </div>
      </div>

      {/* — 3-COLUMN GRID — Document Info (1 col) + Study Tools (2 cols) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* — DOCUMENT INFO CARD — Status, size, pages, counts, and action button */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status row: badge colour depends on document.status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={
                  document.status === "ready"
                    ? "default"        // Ready: default (styled below)
                    : document.status === "processing"
                    ? "secondary"      // Processing: secondary (amber-ish)
                    : "destructive"    // Error: red destructive
                }
                className={document.status === "ready" ? "bg-emerald-500" : ""}  // Override to emerald when ready
              >
                {document.status === "ready" ? "Ready" : document.status === "processing" ? "Processing" : "Error"}
              </Badge>
            </div>
            {/* File size formatted via formatFileSize helper */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Size</span>
              <span className="text-sm">{formatFileSize(document.fileSize)}</span>
            </div>
            {/* Page count from extraction; "—" if not yet extracted */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pages</span>
              <span className="text-sm">{document.pageCount || "—"}</span>
            </div>
            {/* flashcardCount: number of decks generated from this document */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Flashcard Decks</span>
              <span className="text-sm">{flashcardCount}</span>
            </div>
            {/* quizCount: number of quizzes generated from this document */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Quizzes</span>
              <span className="text-sm">{quizCount}</span>
            </div>

            {/* Action button: "Process Document" while uploading/processing; "Re-Extract Text" otherwise */}
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
              // Purple-accented outline button for re-extraction (already processed documents)
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

        {/* — STUDY TOOLS CARD — 4 AI-powered action buttons (2-col grid) */}
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
            {/* Flashcards button: disabled unless document.status === "ready" */}
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
            {/* Quiz button: disabled unless document is ready */}
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
            {/* Summarize button: AI-generated summary of the document */}
            <Button
              onClick={handleSummarize}
              disabled={document.status !== "ready" || summaryLoading}
              variant="outline"
              className="w-full h-auto py-6 flex-col gap-2 bg-transparent"
            >
              {summaryLoading ? (
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              ) : (
                <Wand2 className="h-8 w-8 text-purple-600" />
              )}
              <span className="font-semibold">AI Summarize</span>
              <span className="text-xs text-muted-foreground">
                Get a quick summary
              </span>
            </Button>
            {/* Chat button: passes document ID as query param so the chat context is pre-loaded */}
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
            {/* View PDF button: always enabled — opens the public Storage URL in a new tab */}
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

      {/* — QUIZ PERFORMANCE SECTION — Only rendered if at least one quiz exists */}
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
                {/* — STATS GRID — Total / Average / Best across all attempts */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-bold mt-2">{quizAttempts.length}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    {/* Sum all percentages, divide by count */}
                    <p className="text-2xl font-bold mt-2">
                      {Math.round(
                        quizAttempts.reduce((sum, a) => sum + (a.score / a.total_questions * 100), 0) / quizAttempts.length
                      )}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-sm text-muted-foreground">Best Score</p>
                    {/* Spread attempt percentages to find the maximum */}
                    <p className="text-2xl font-bold mt-2">
                      {Math.round(
                        Math.max(...quizAttempts.map(a => a.score / a.total_questions * 100))
                      )}%
                    </p>
                  </div>
                </div>

                {/* — RECENT ATTEMPTS LIST — Up to 10 most recent attempts */}
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
                            {/* Colour-coded icon circle: emerald ≥80%, amber ≥60%, rose <60% */}
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              percentage >= 80 ? 'bg-emerald-100' : percentage >= 60 ? 'bg-amber-100' : 'bg-rose-100'
                            }`}>
                              {percentage >= 80 ? (
                                <CheckCircle className={`h-4 w-4 ${percentage >= 80 ? 'text-emerald-600' : ''}`} />
                              ) : (
                                // For amber/rose tiers show the % number instead of an icon
                                <span className={`text-xs font-bold ${
                                  percentage >= 60 ? 'text-amber-600' : 'text-rose-600'
                                }`}>{percentage}%</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Score fraction e.g. "8/10 correct" */}
                              <p className="text-sm font-medium">
                                {attempt.score}/{attempt.total_questions} correct
                              </p>
                              {/* Date + time of attempt using locale formatting */}
                              <p className="text-xs text-muted-foreground">
                                {new Date(attempt.completed_at).toLocaleDateString()} {new Date(attempt.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{percentage}%</p>
                            {/* Time taken rounded to nearest minute */}
                            <p className="text-xs text-muted-foreground">{Math.round(attempt.time_taken / 60)}m</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Empty state when no attempts yet
              <div className="text-center py-8">
                <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No quiz attempts yet</p>
                <p className="text-sm text-muted-foreground mt-1">Take a quiz to see your performance here</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* — CONTENT PREVIEW — Only shown when text was successfully extracted */}
      {content && (
        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
            <CardDescription>Extracted text from your document</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Two tabs: Preview (first 1500 chars) and Full Text (scrollable) */}
            <Tabs defaultValue="preview">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="full">Full Text</TabsTrigger>
              </TabsList>
              {/* Preview tab: truncates at 1500 chars to keep it scannable */}
              <TabsContent value="preview" className="mt-4">
                <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed">
                  {content.slice(0, 1500)}
                  {content.length > 1500 && "..."}   {/* Ellipsis if truncated */}
                </div>
              </TabsContent>
              {/* Full Text tab: scrollable area with whitespace-pre-wrap to preserve formatting */}
              <TabsContent value="full" className="mt-4">
                <div className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {content}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* — AI SUMMARY MODAL — Displays the generated summary */}
      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document Summary</DialogTitle>
            <DialogDescription>
              AI-generated summary of {document?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {summaryLoading ? (
              // Loading state: spinner + message
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <p className="text-muted-foreground">Generating summary...</p>
              </div>
            ) : (
              // Summary text: formatted with whitespace preserved
              <div className="rounded-lg bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
