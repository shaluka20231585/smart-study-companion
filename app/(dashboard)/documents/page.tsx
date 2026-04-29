// Marks this as a Client Component — required for hooks and event handlers
"use client"

// useEffect: Runs fetchDocuments on mount and when dependencies change
// useState: Manages documents list, loading state, and dialog open states
// useCallback: Memoizes fetchDocuments so it's stable for the useEffect dependency array
import { useEffect, useState, useCallback } from "react"

// useAuth: Provides the currently logged-in user's ID
import { useAuth } from "@/contexts/auth-context"

// Supabase browser client — used directly here for Storage file deletion
import { supabase } from "@/lib/supabase"

// Database helpers: getDocuments fetches all docs, deleteDocument removes a record
import { getDocuments, deleteDocument } from "@/lib/queries"

// shadcn/ui component imports for the card grid layout
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"         // Colored status labels (Ready / Processing / Error)
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav" // Navigation breadcrumbs

// AlertDialog for the delete confirmation modal
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

// Icon imports
import { FileText, Trash2, Brain, HelpCircle, Upload, Eye, BookOpen } from "lucide-react"
// FileText: Document icon placeholder
// Trash2: Delete button icon
// Brain: Generate Flashcards button icon
// HelpCircle: Generate Quiz button icon
// Upload: Upload button icon
// Eye: View Details button icon
// BookOpen: Library icon

// toast: Shows non-blocking success/error notifications in the bottom corner
import { toast } from "sonner"

// Link: Client-side navigation component
import Link from "next/link"

// Document type from our shared type definitions
import type { Document } from "@/lib/types"

// Dialog component for the PDF upload flow
import { PDFUploadDialog } from "@/components/documents/upload-dialog"

export default function DocumentsPage() {
  // Currently logged-in user (for user-scoped database queries)
  const { user } = useAuth()

  // documents: Array of all documents belonging to this user
  const [documents, setDocuments] = useState<Document[]>([])

  // loading: true while the initial fetch is in progress — shows skeleton cards
  const [loading, setLoading] = useState(true)

  // uploadDialogOpen: Controls whether the PDF upload modal is visible
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  // deleteDialogOpen: Controls whether the delete confirmation modal is visible
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // documentToDelete: Holds the document the user wants to delete until they confirm
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)

  // Wrapped in useCallback so the function reference stays stable across renders
  // This prevents an infinite loop in the useEffect dependency array
  const fetchDocuments = useCallback(async () => {
    if (!user) return // Can't fetch without a logged-in user

    try {
      const docs = await getDocuments(user.id) // Query Supabase for this user's documents
      setDocuments(docs || [])                  // Default to empty array if null
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast.error("Failed to load documents") // Show a toast notification on failure
    } finally {
      setLoading(false) // Stop showing skeletons
    }
  }, [user]) // Recreate the function only when `user` changes

  // Fetch documents once after the component mounts (and when fetchDocuments changes)
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Handles the actual deletion after the user confirms in the AlertDialog
  const handleDelete = async () => {
    if (!documentToDelete) return // Safety check: do nothing if no document was selected

    try {
      // Step 1: Delete the physical PDF file from Supabase Storage
      if (documentToDelete.fileUrl) {
        try {
          // Extract just the filename from the full URL to build the storage path
          const filePath = documentToDelete.fileUrl.split("/").pop()
          if (filePath) {
            // Files are stored under `documents/{userId}/{filename}`
            await supabase.storage
              .from("documents")
              .remove([`${user?.id}/${filePath}`])
          }
        } catch (e) {
          // The file might already be gone — don't block the database deletion
        }
      }

      // Step 2: Delete the database record (cascades to chunks, flashcards, quizzes)
      await deleteDocument(documentToDelete.id)

      // Optimistically remove the deleted document from the local state
      // so the UI updates instantly without needing a refetch
      setDocuments((prev) => prev.filter((d) => d.id !== documentToDelete.id))
      toast.success("Document deleted successfully")
    } catch (error) {
      console.error("Error deleting document:", error)
      toast.error("Failed to delete document")
    } finally {
      // Always close the dialog and clear the pending document, even on error
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  // Converts raw byte count to a human-readable string (e.g. "1.4 MB")
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024)            return `${bytes} B`
    if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Returns a color-coded Badge component based on the document's processing status
  const getStatusBadge = (status: Document["status"]) => {
    switch (status) {
      case "ready":      return <Badge variant="default"  className="bg-emerald-500">Ready</Badge>
      case "processing": return <Badge variant="secondary" className="bg-amber-500 text-white">Processing</Badge>
      case "error":      return <Badge variant="destructive">Error</Badge>
      default:           return <Badge variant="outline">Uploading</Badge>
    }
  }

  return (
    // pb-20 adds bottom padding on mobile so content isn't hidden behind the bottom nav bar
    <div className="pb-20 lg:pb-0">
      {/* Breadcrumb navigation */}
      <BreadcrumbNav items={[{ label: "Documents", icon: <FileText className="h-4 w-4" /> }]} />

      {/* Page heading + Upload button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Documents</h1>
          <p className="text-muted-foreground mt-1">Upload PDFs and access AI-powered study tools</p>
        </div>
        {/* Opens the upload dialog when clicked */}
        <Button onClick={() => setUploadDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg transition-all" size="lg">
          <Upload className="h-5 w-5" />
          Upload PDF
        </Button>
      </div>

      {/* ── LOADING STATE: skeleton card grid ── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 space-y-0">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        // ── EMPTY STATE: shown when the user has no documents yet ──
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center max-w-sm">
            <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-primary/60" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Start Your Learning Journey</h3>
            <p className="text-muted-foreground mb-6">
              Upload a PDF document to unlock AI-powered study tools including flashcards, quizzes, summaries, and an AI tutor.
            </p>
            <Button onClick={() => setUploadDialogOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg transition-all" size="lg">
              <Upload className="h-5 w-5" />
              Upload Your First PDF
            </Button>
            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-xs text-muted-foreground mb-4 font-semibold">SUPPORTED FORMATS</p>
              <p className="text-sm text-muted-foreground">PDF documents up to 100 MB</p>
            </div>
          </div>
        </div>
      ) : (
        // ── DOCUMENT GRID: one card per document ──
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <Card key={document.id} className="group relative flex flex-col overflow-hidden border transition-all hover:border-primary/50 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  {/* Document icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* truncate prevents long names from breaking the layout */}
                    <CardTitle className="text-base truncate">{document.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {document.uploadedAt?.toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {/* Status badge top-right */}
                  {getStatusBadge(document.status)}
                </div>
              </CardHeader>

              {/* Document metadata: file size, page count */}
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pages</span>
                    {/* Show — if page count is not yet known (still processing) */}
                    <span>{document.pageCount || "—"}</span>
                  </div>
                  {/* Show error message only when the document has failed processing */}
                  {document.status === "error" && document.errorMessage && (
                    <p className="text-xs text-destructive mt-1">{document.errorMessage}</p>
                  )}
                </div>

                {/* ── ACTION BUTTONS — always visible ── */}
                <div className="mt-4 flex flex-col gap-2 space-y-0">
                  {/* View Details — always available */}
                  <Button asChild variant="outline" size="sm" className="w-full justify-start gap-2 rounded-lg transition-all hover:border-primary/50 hover:bg-primary/5">
                    <Link href={`/documents/${document.id}`}>
                      <Eye className="h-4 w-4" />
                      View Details
                    </Link>
                  </Button>

                  {/* Generate Flashcards — only when document is ready */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 rounded-lg transition-all hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 disabled:opacity-50"
                    disabled={document.status !== "ready"}
                  >
                    <Link href={`/documents/${document.id}/flashcards`}>
                      <Brain className="h-4 w-4" />
                      Generate Flashcards
                    </Link>
                  </Button>

                  {/* Generate Quiz — only when document is ready */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 rounded-lg transition-all hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-900/10 disabled:opacity-50"
                    disabled={document.status !== "ready"}
                  >
                    <Link href={`/documents/${document.id}/quiz`}>
                      <HelpCircle className="h-4 w-4" />
                      Generate Quiz
                    </Link>
                  </Button>

                  {/* Delete — opens the confirmation dialog */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setDocumentToDelete(document)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PDF Upload Dialog — controlled by uploadDialogOpen state */}
      {/* onUploadComplete refetches the document list after a successful upload */}
      <PDFUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={fetchDocuments}
      />

      {/* Delete Confirmation Dialog — shown before permanently deleting a document */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              {/* documentToDelete?.name uses optional chaining in case it's null */}
              Are you sure you want to delete &quot;{documentToDelete?.name}&quot;? This will also
              delete all associated flashcards and quizzes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* Calls handleDelete which removes the file and the database record */}
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
