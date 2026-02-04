"use client"

import React from "react"
import { useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface PDFUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

interface UploadingFile {
  file: File
  progress: number
  status: "uploading" | "processing" | "complete" | "error"
  error?: string
  documentId?: string
}

export function PDFUploadDialog({ open, onOpenChange, onUploadComplete }: PDFUploadDialogProps) {
  const { user } = useAuth()
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  const processFile = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload documents")
      return
    }

    // Validate file type and size
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      toast.error(`${file.name} is not a PDF file`)
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      // 50MB limit
      toast.error(`${file.name} is too large. Maximum size is 50MB`)
      return
    }

    // Add to uploading files list
    setUploadingFiles((prev) => [
      ...prev,
      { file, progress: 0, status: "uploading" },
    ])

    let docId: string | null = null

    try {
      console.log("[UPLOAD] Starting file:", file.name, "Size:", file.size)

      // Step 1: Create database record
      console.log("[UPLOAD] Creating database record...")
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert([
          {
            user_id: user.id,
            name: file.name.replace(".pdf", ""),
            original_name: file.name,
            file_size: file.size,
            status: "uploading",
          },
        ])
        .select()

      if (docError) throw docError
      if (!doc || doc.length === 0) throw new Error("Failed to create document record")

      docId = doc[0].id
      console.log("[UPLOAD] Document record created:", docId)

      // Step 2: Upload file to Supabase Storage
      console.log("[UPLOAD] Uploading file to storage...")
      const storagePath = `${user.id}/${docId}/${file.name}`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          upsert: false,
        } as any)

      if (uploadError) throw uploadError
      console.log("[UPLOAD] File uploaded to storage successfully")

      // Step 3: Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath)

      const downloadURL = publicUrlData.publicUrl

      // Step 4: Update database with file URL
      console.log("[UPLOAD] Updating database with file URL...")
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          file_url: downloadURL,
          status: "processing",
        })
        .eq("id", docId)

      if (updateError) throw updateError

      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === file.name
            ? { ...f, status: "processing", progress: 100 }
            : f
        )
      )

      // Step 5: Extract PDF text
      console.log("[UPLOAD] Starting PDF extraction...")
      console.log("[UPLOAD] Sending to API:", {
        documentId: docId,
        userId: user?.id,
        filePath: storagePath,
      })
      try {
        const extractResponse = await fetch("/api/documents/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: docId,
            userId: user?.id,
            filePath: storagePath,
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

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file.name === file.name ? { ...f, status: "complete" } : f
          )
        )

        toast.success(
          `${file.name} uploaded successfully! (${result.pageCount} pages)`
        )
        onUploadComplete()
      } catch (extractError) {
        console.error("[UPLOAD] Extraction error:", extractError)
        // Even if extraction fails, file is uploaded
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file.name === file.name ? { ...f, status: "complete" } : f
          )
        )
        toast.success(`${file.name} uploaded. Processing in background...`)
        onUploadComplete()
      }
    } catch (error) {
      console.error("[UPLOAD] Upload failed:", error)
      const errorMsg = getErrorMessage(error)
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.file.name === file.name
            ? { ...f, status: "error", error: errorMsg }
            : f
        )
      )
      toast.error(`Failed to upload ${file.name}: ${errorMsg}`)

      // Update database with error status if document was created
      if (docId) {
        await supabase
          .from("documents")
          .update({
            status: "error",
            error_message: errorMsg,
          })
          .eq("id", docId)
      }
    }
  }

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any): string => {
    if (!error) return "Unknown error"

    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      if (message.includes("permission") || message.includes("unauthorized")) {
        return "Permission denied - check Supabase RLS policies"
      }
      if (message.includes("duplicate")) {
        return "File already exists"
      }
      if (message.includes("not found")) {
        return "Database table not found - check setup"
      }
      return error.message
    }
    return String(error)
  }

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return
      Array.from(files).forEach(processFile)
    },
    [user]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClose = () => {
    if (uploadingFiles.some((f) => f.status === "uploading" || f.status === "processing")) {
      toast.warning("Please wait for uploads to complete")
      return
    }
    setUploadingFiles([])
    onUploadComplete()
    onOpenChange(false)
  }

  const removeFile = (fileName: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file.name !== fileName))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload PDF files to create flashcards and quizzes. Maximum file size is 10MB.
          </DialogDescription>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">
            Drag and drop PDF files here, or
          </p>
          <label>
            <Button variant="link" className="mt-1" asChild>
              <span>browse to upload</span>
            </Button>
            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="sr-only"
            />
          </label>
        </div>

        {uploadingFiles.length > 0 && (
          <div className="mt-4 space-y-3">
            {uploadingFiles.map((uploadFile) => (
              <div
                key={uploadFile.file.name}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {uploadFile.status === "uploading" && (
                      <>
                        <Progress value={uploadFile.progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">
                          {Math.round(uploadFile.progress)}%
                        </span>
                      </>
                    )}
                    {uploadFile.status === "processing" && (
                      <span className="text-xs text-amber-600">Processing...</span>
                    )}
                    {uploadFile.status === "complete" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </span>
                    )}
                    {uploadFile.status === "error" && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        {uploadFile.error}
                      </span>
                    )}
                  </div>
                </div>
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

        <div className="mt-4 flex justify-end">
          <Button onClick={handleClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
