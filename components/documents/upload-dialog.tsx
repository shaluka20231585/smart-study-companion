// Client Component — required for hooks, drag-and-drop event handlers, and file upload state
"use client"

import React from "react"
import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context" // Current user ID is needed for scoped storage paths
import { supabase } from "@/lib/supabase"         // Direct Supabase client for DB and Storage

// shadcn/ui Dialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"  // Per-file upload progress bar
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"
// Upload: Drag zone icon
// FileText: Per-file icon in the upload list
// X: Remove completed/failed file button
// CheckCircle: Success status indicator
// AlertCircle: Error status indicator
import { toast } from "sonner"

// Props for the dialog — controlled by parent (documents/page.tsx)
interface PDFUploadDialogProps {
  open: boolean                         // Whether the dialog is visible
  onOpenChange: (open: boolean) => void // Controlled open/close callback
  onUploadComplete: () => void          // Called after each file finishes uploading (refreshes list)
}

// Tracks the status of each file being uploaded
interface UploadingFile {
  file: File
  progress: number                                       // 0–100 upload progress
  status: "uploading" | "processing" | "complete" | "error"
  error?: string         // Human-readable error message shown under the file
  documentId?: string    // Supabase document row ID (set after DB record is created)
}

export function PDFUploadDialog({ open, onOpenChange, onUploadComplete }: PDFUploadDialogProps) {
  const { user } = useAuth()

  // uploadingFiles: One entry per file currently in the upload pipeline
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  // isDragging: True while a file is being dragged over the drop zone
  const [isDragging, setIsDragging] = useState(false)

  /**
   * processFile — Full 5-step upload pipeline for a single PDF:
   * 1. Validate type and size
   * 2. Create a document DB record (status: "uploading")
   * 3. Upload file bytes to Supabase Storage
   * 4. Update DB record with public URL (status: "processing")
   * 5. Call extract API to run text extraction (status: "complete")
   */
  const processFile = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload documents")
      return
    }

    // Validate: only accept .pdf files
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      toast.error(`${file.name} is not a PDF file`)
      return
    }

    // Validate: reject files over 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast.error(`${file.name} is too large. Maximum size is 50MB`)
      return
    }

    // Add this file to the uploading list with initial 0% progress
    setUploadingFiles((prev) => [
      ...prev,
      { file, progress: 0, status: "uploading" },
    ])

    let docId: string | null = null // Keep track so we can update status on error

    try {
      console.log("[UPLOAD] Starting file:", file.name, "Size:", file.size)

      // ---- STEP 1: Create the document row in the database ----
      console.log("[UPLOAD] Creating database record...")
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert([{
          user_id:       user.id,
          name:          file.name.replace(".pdf", ""), // Strip extension for display name
          original_name: file.name,
          file_size:     file.size,
          status:        "uploading",
        }])
        .select()

      if (docError) throw docError
      if (!doc || doc.length === 0) throw new Error("Failed to create document record")

      docId = doc[0].id // Save ID for error recovery
      console.log("[UPLOAD] Document record created:", docId)

      // ---- STEP 2: Upload the PDF bytes to Supabase Storage ----
      console.log("[UPLOAD] Uploading file to storage...")
      // Path: user-id/doc-id/filename.pdf — namespaced by user and document
      const storagePath = `${user.id}/${docId}/${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("documents")  // "documents" is the Storage bucket name
        .upload(storagePath, file, {
          upsert: false,    // Fail if file already exists at this path
        } as any)

      if (uploadError) throw uploadError
      console.log("[UPLOAD] File uploaded to storage successfully")

      // ---- STEP 3: Get the public URL for the uploaded file ----
      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath) // Constructs a permanent public URL

      const downloadURL = publicUrlData.publicUrl

      // ---- STEP 4: Update the DB record with the public URL ----
      console.log("[UPLOAD] Updating database with file URL...")
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          file_url: downloadURL,
          status:   "processing", // Signal that text extraction is next
        })
        .eq("id", docId)

      if (updateError) throw updateError

      // Show "Processing..." status in the file list
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === file.name
            ? { ...f, status: "processing", progress: 100 }
            : f
        )
      )

      // ---- STEP 5: Call the extraction API to process the PDF ----
      console.log("[UPLOAD] Starting PDF extraction...")
      console.log("[UPLOAD] Sending to API:", {
        documentId: docId,
        userId:     user?.id,
        filePath:   storagePath,
      })
      try {
        const extractResponse = await fetch("/api/documents/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: docId,
            userId:     user?.id,
            filePath:   storagePath, // Used by the API to download from Storage
          }),
        })

        if (!extractResponse.ok) {
          const errorData = await extractResponse.json()
          throw new Error(
            errorData.error ||
              `Extraction failed with status ${extractResponse.status}`
          )
        }

        const result = await extractResponse.json()
        console.log("[UPLOAD] PDF extraction successful:", result.pageCount, "pages")

        // Mark the file as fully complete
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file.name === file.name ? { ...f, status: "complete" } : f
          )
        )

        toast.success(`${file.name} uploaded successfully! (${result.pageCount} pages)`)
        onUploadComplete() // Trigger parent refresh
      } catch (extractError) {
        console.error("[UPLOAD] Extraction error:", extractError)
        // Even if extraction fails, the file was uploaded successfully
        // Show complete status so the user can manually trigger extraction later
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file.name === file.name ? { ...f, status: "complete" } : f
          )
        )
        toast.success(`${file.name} uploaded. Processing in background...`)
        onUploadComplete() // Still refresh the list
      }
    } catch (error) {
      console.error("[UPLOAD] Upload failed:", error)
      const errorMsg = getErrorMessage(error)

      // Show error status in the file list
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === file.name
            ? { ...f, status: "error", error: errorMsg }
            : f
        )
      )
      toast.error(`Failed to upload ${file.name}: ${errorMsg}`)

      // If the DB record was already created, mark it as errored
      if (docId) {
        await supabase
          .from("documents")
          .update({ status: "error", error_message: errorMsg })
          .eq("id", docId)
      }
    }
  }

  /**
   * getErrorMessage — Converts raw errors into user-friendly messages
   * Provides specific guidance for common Supabase error patterns
   */
  const getErrorMessage = (error: any): string => {
    if (!error) return "Unknown error"

    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      // RLS policy violations or missing auth
      if (message.includes("permission") || message.includes("unauthorized")) {
        return "Permission denied - check Supabase RLS policies"
      }
      // Duplicate storage path
      if (message.includes("duplicate")) {
        return "File already exists"
      }
      // Supabase table not found
      if (message.includes("not found")) {
        return "Database table not found - check setup"
      }
      return error.message
    }
    return String(error)
  }

  // Wrapped in useCallback to prevent unnecessary re-renders when passed as a prop
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return
      // Process each selected file independently (parallel uploads)
      Array.from(files).forEach(processFile)
    },
    [user] // Re-create if user changes
  )

  // Drop handler — extracts files from the drag event and passes to handleFileSelect
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()       // Prevent browser from navigating to the dropped file
      setIsDragging(false)     // Remove drag highlight
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  // DragOver: Allow drop by preventing default (without this, drop won't fire)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)        // Highlight the drop zone
  }, [])

  // DragLeave: Remove highlight when user drags out of the zone
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // Prevent closing the dialog while uploads are still in progress
  const handleClose = () => {
    if (uploadingFiles.some((f) => f.status === "uploading" || f.status === "processing")) {
      toast.warning("Please wait for uploads to complete")
      return
    }
    setUploadingFiles([])    // Clear the file list on close
    onUploadComplete()        // Refresh the parent document list
    onOpenChange(false)       // Close the dialog
  }

  // Removes a completed or errored file from the upload list
  const removeFile = (fileName: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file.name !== fileName))
  }

  // — DIALOG JSX —
  return (
    // onOpenChange wired to handleClose so the close guard runs on backdrop click / Escape
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload PDF files to create flashcards and quizzes. Maximum file size is 10MB.
          </DialogDescription>
        </DialogHeader>

        {/* — DRAG-AND-DROP ZONE — Highlights when a file is dragged over */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"     // Highlighted while dragging
              : "border-border hover:border-primary/50"  // Default dashed border
          }`}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Drag and drop PDF files here, or
          </p>
          {/* Hidden file input — clicking "browse to upload" opens the OS file picker */}
          <label>
            <Button variant="link" className="mt-1" asChild>
              <span>browse to upload</span>
            </Button>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple                               // Allow selecting multiple PDFs at once
              onChange={(e) => handleFileSelect(e.target.files)}
              className="sr-only"                   // Visually hidden; label acts as the click target
            />
          </label>
        </div>

        {/* — UPLOADING FILES LIST — One entry per file currently in the pipeline */}
        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-3">
            {uploadingFiles.map((uploadFile) => (
              <div
                key={uploadFile.file.name}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                {/* File icon badge */}
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* File name — truncated if too long */}
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Status: "uploading" — show progress bar + percentage */}
                    {uploadFile.status === "uploading" && (
                      <>
                        <Progress value={uploadFile.progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(uploadFile.progress)}%
                        </span>
                      </>
                    )}
                    {/* Status: "processing" — text extraction is running */}
                    {uploadFile.status === "processing" && (
                      <span className="text-xs text-amber-600">Processing...</span>
                    )}
                    {/* Status: "complete" — green check + "Complete" */}
                    {uploadFile.status === "complete" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </span>
                    )}
                    {/* Status: "error" — red alert icon + error message */}
                    {uploadFile.status === "error" && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {uploadFile.error}
                      </span>
                    )}
                  </div>
                </div>
                {/* Remove button: only visible once upload finishes (complete or error) */}
                {(uploadFile.status === "complete" || uploadFile.status === "error") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeFile(uploadFile.file.name)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Done button: triggers handleClose which blocks if uploads are still active */}
        <div className="mt-4 flex justify-end">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
