// Next.js Route Handler — POST /api/documents/extract
// 6-step PDF processing pipeline: download → parse → detect → clean → chunk → store

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"  // Admin Supabase client for service-key operations
import {
  cleanExtractedText,         // Strips headers/footers/artefacts from raw PDF text
  chunkText,                  // Splits cleaned text into overlapping token-sized chunks
  estimateTokenCount,         // Rough token count estimate for a string (chars / 4)
  validateExtraction,         // Checks quality/completeness of extracted text
  detectScannedPDF,           // Returns true if text is too sparse to be machine-readable
  validateTextQuality,        // Checks alphanumeric ratio, word count, sentence count
  sanitizeTextForAI,          // Removes remaining control characters and encoding artefacts
} from "@/lib/pdf-helpers"
import { storeChunks } from "@/lib/text-chunks"  // Persists text chunks into the DB
import { extractText } from "unpdf"                // Native Node.js PDF text extractor

/**
 * extractTextFromPDFBuffer — Low-level PDF text extraction using the unpdf library
 * Converts the binary Buffer to Uint8Array (unpdf requirement), then joins pages
 */
async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  try {
    console.log("[EXTRACT] Using unpdf library for text extraction")
    
    // Convert Buffer to Uint8Array as required by unpdf
    const uint8Array = new Uint8Array(buffer)
    
    // Extract text using unpdf
    const result = await extractText(uint8Array)
    
    console.log(`[EXTRACT] ✓ PDF parsed successfully with unpdf`)
    console.log(`[EXTRACT]   Pages: ${result.totalPages}`)
    console.log(`[EXTRACT]   Result type:`, typeof result.text, Array.isArray(result.text) ? 'array' : 'not array')
    
    // Handle text - it may be an array of strings (one per page) or a single string
    let fullText: string
    if (Array.isArray(result.text)) {
      fullText = result.text.join('\n\n')
      console.log(`[EXTRACT]   Joined ${result.text.length} pages of text`)
    } else if (typeof result.text === 'string') {
      fullText = result.text
    } else {
      // Handle other cases
      fullText = String(result.text || '')
    }
    
    console.log(`[EXTRACT]   Text length: ${fullText.length} characters`)
    
    // Show preview of extracted text
    const preview = fullText.substring(0, 500).replace(/\s+/g, ' ').trim()
    console.log(`[EXTRACT]   Preview: ${preview}`)
    
    if (!fullText || fullText.length < 50) {
      throw new Error("No text extracted from PDF - document may be scanned or image-based")
    }
    
    return fullText.trim()
    
  } catch (error) {
    console.error("[EXTRACT] Error using unpdf:", error)
    throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Read from environment — URL and anon key are public; service key is server-only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY  // Not used here but available
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY        // Bypasses RLS for server-side ops

// ============================================================================
// ERROR DEFINITIONS
// ============================================================================

/**
 * ExtractionError — Custom error class for structured pipeline failures
 * Carries a machine-readable `code` (for the JSON response) plus optional `details`
 */
class ExtractionError extends Error {
  constructor(
    public code: string,    // Machine-readable error code (maps to ErrorCodes)
    message: string,        // Human-readable description
    public details?: any    // Optional extra context (e.g. Supabase error object)
  ) {
    super(message)
    this.name = "ExtractionError"
  }
}

// Enumeration of all possible error codes — returned in the JSON error response
const ErrorCodes = {
  SUPABASE_CONFIG_MISSING: "SUPABASE_CONFIG_MISSING",  // Env vars not set
  MISSING_DOCUMENT_ID:     "MISSING_DOCUMENT_ID",      // Request body missing documentId
  MISSING_USER_ID:         "MISSING_USER_ID",          // Request body missing userId
  DOWNLOAD_FAILED:         "DOWNLOAD_FAILED",          // Storage download or missing filePath
  PARSE_FAILED:            "PARSE_FAILED",             // unpdf threw an error
  EMPTY_PDF:               "EMPTY_PDF",                // Buffer was empty
  SCANNED_PDF:             "SCANNED_PDF",              // Too little text to be usable
  CHUNK_FAILED:            "CHUNK_FAILED",             // Chunking step failed
  STORAGE_FAILED:          "STORAGE_FAILED",           // DB chunk insert failed
  INVALID_CONTENT:         "INVALID_CONTENT",          // Text quality check failed
}

// ============================================================================
// STEP 1: VALIDATE AND RETRIEVE PDF FROM SUPABASE
// ============================================================================

/**
 * downloadPDFFromSupabase — Downloads a PDF from Supabase Storage as a Node.js Buffer
 * Uses the service-role admin client to bypass RLS policies for server-side access
 * @param documentId — Used only for logging/error context
 * @param filePath   — Storage path in format: userId/docId/filename.pdf
 */
async function downloadPDFFromSupabase(
  documentId: string,
  filePath: string
): Promise<Buffer> {
  console.log("[EXTRACT] STEP 1: Retrieving PDF from Supabase Storage")
  console.log("[EXTRACT] Document ID:", documentId)
  console.log("[EXTRACT] File path:", filePath)

  // Guard: fail early if required env vars are absent
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new ExtractionError(
      ErrorCodes.SUPABASE_CONFIG_MISSING,
      "Supabase configuration missing (URL or Service Key)",
      { supabaseUrl, hasServiceKey: !!supabaseServiceKey }
    )
  }

  try {
    // Create admin client with service key — this key bypasses RLS (server-side only)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Download PDF binary from the "documents" bucket at the given path
    const { data, error } = await supabaseAdmin.storage.from("documents").download(filePath)

    if (error || !data) {
      throw new ExtractionError(
        ErrorCodes.DOWNLOAD_FAILED,
        `Failed to download PDF from Supabase: ${error?.message}`,
        { error }
      )
    }

    // Supabase returns a Web API Blob; convert to ArrayBuffer then to Node.js Buffer
    // Node.js Buffer is required by unpdf and other server-side processing libraries
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Sanity check: ensure the conversion produced a valid Buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Failed to create valid Node.js Buffer from downloaded data")
    }

    console.log("[EXTRACT] ✓ PDF downloaded successfully")
    console.log("[EXTRACT]   Size:", buffer.length, "bytes")
    console.log("[EXTRACT]   First bytes (hex):", buffer.slice(0, 4).toString("hex"))  // Should start with 25504446 (%PDF)
    console.log("[EXTRACT]   Is valid Buffer:", Buffer.isBuffer(buffer))

    return buffer
  } catch (error) {
    if (error instanceof ExtractionError) throw error   // Re-throw typed errors unchanged
    throw new ExtractionError(
      ErrorCodes.DOWNLOAD_FAILED,
      "PDF download failed: " + (error instanceof Error ? error.message : String(error))
    )
  }
}

// ============================================================================
// STEP 2: PARSE PDF TEXT EXTRACTION
// ============================================================================

async function parsePDF(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  console.log("[EXTRACT] STEP 2: Parsing PDF")

  if (!buffer || buffer.length === 0) {
    throw new ExtractionError(ErrorCodes.EMPTY_PDF, "PDF buffer is empty")
  }

  try {
    // Validate buffer
    console.log("[EXTRACT] Buffer validation:")
    console.log("[EXTRACT]   isBuffer:", Buffer.isBuffer(buffer))
    console.log("[EXTRACT]   length:", buffer.length)
    console.log("[EXTRACT]   first bytes (hex):", buffer.slice(0, 4).toString("hex"))

    // Extract text from PDF buffer
    const text = await extractTextFromPDFBuffer(buffer)

    // Estimate page count based on text length (rough approximation)
    // Average page has ~250 words = ~1500 characters
    const estimatedPageCount = Math.max(1, Math.ceil(text.length / 1500))

    console.log("[EXTRACT] ✓ PDF parsed successfully")
    console.log("[EXTRACT]   Raw text length:", text.length, "characters")
    console.log("[EXTRACT]   Estimated pages:", estimatedPageCount)

    return {
      text: text.trim(),
      pageCount: estimatedPageCount,
    }
  } catch (error) {
    throw new ExtractionError(
      ErrorCodes.PARSE_FAILED,
      "PDF parsing failed: " + (error instanceof Error ? error.message : String(error))
    )
  }
}

// ============================================================================
// STEP 3: DETECT NON-EXTRACTABLE PDFS
// ============================================================================

function detectExtractability(text: string, pageCount: number): { isExtractable: boolean; warning?: string } {
  console.log("[EXTRACT] STEP 3: Detecting PDF extractability")

  const isScanned = detectScannedPDF(text)

  if (isScanned) {
    console.log("[EXTRACT] ⚠ WARNING: PDF appears to be scanned (low text extraction)")
    return {
      isExtractable: false,
      warning: "Scanned PDF detected. Text extraction yielded only " + text.length + " characters.",
    }
  }

  console.log("[EXTRACT] ✓ PDF is text-extractable")
  return { isExtractable: true }
}

// ============================================================================
// STEP 4: CLEAN EXTRACTED TEXT
// ============================================================================

function processExtractedText(rawText: string): string {
  console.log("[EXTRACT] STEP 4: Cleaning extracted text")
  console.log("[EXTRACT]   Raw text length:", rawText.length)

  const cleaned = cleanExtractedText(rawText)

  console.log("[EXTRACT] ✓ Text cleaned")
  console.log("[EXTRACT]   Cleaned text length:", cleaned.length)
  console.log(
    "[EXTRACT]   Compression ratio:",
    ((1 - cleaned.length / rawText.length) * 100).toFixed(1) + "%"
  )

  return cleaned
}

// ============================================================================
// STEP 5: CHUNK THE TEXT
// ============================================================================

function generateChunks(cleanedText: string): string[] {
  console.log("[EXTRACT] STEP 5: Chunking text")

  const chunks = chunkText(cleanedText, 800, 100) // 800 tokens per chunk, 100 overlap

  console.log("[EXTRACT] ✓ Text chunked")
  console.log("[EXTRACT]   Total chunks:", chunks.length)
  console.log("[EXTRACT]   Chunk sizes:", chunks.map((c) => estimateTokenCount(c)))

  return chunks
}

// ============================================================================
// MAIN EXTRACTION ROUTE
// ============================================================================

/**
 * POST /api/documents/extract
 * Orchestrates the 6-step PDF processing pipeline:
 * 1. Download PDF bytes from Supabase Storage
 * 2. Parse text with unpdf
 * 3. Detect if PDF is scanned/image-based (not extractable)
 * 4. Clean the raw text (strip noise, normalise whitespace)
 * 4.5 Validate text quality for AI consumption
 * 5. Chunk text into overlapping token-sized segments
 * 6. Store chunks in the database + update document status to "ready"
 */
export async function POST(request: Request) {
  const startTime = Date.now()  // Track total pipeline duration for logging

  try {
    // Parse JSON body — sent by pdf-upload-dialog.tsx after file upload completes
    const body = await request.json()
    console.log("[EXTRACT] Request body received:", body)
    
    const { documentId, userId, filePath } = body

    // Input validation — fail fast with specific error codes before doing any work
    if (!documentId) {
      throw new ExtractionError(ErrorCodes.MISSING_DOCUMENT_ID, "Document ID is required")
    }

    if (!userId) {
      console.error("[EXTRACT] userId validation failed. Received body:", body)
      throw new ExtractionError(ErrorCodes.MISSING_USER_ID, "User ID is required")
    }

    if (!filePath) {
      // filePath is needed to download from Storage — can't derive it server-side
      throw new ExtractionError(
        ErrorCodes.DOWNLOAD_FAILED,
        "File path is required for server-side download"
      )
    }

    console.log(
      "\n[EXTRACT] ════════════════════════════════════════════════════════════════"
    )
    console.log("[EXTRACT] PDF EXTRACTION PIPELINE STARTED")
    console.log("[EXTRACT] Document:", documentId)
    console.log("[EXTRACT] File path:", filePath)
    console.log(
      "[EXTRACT] ════════════════════════════════════════════════════════════════\n"
    )

    // ════════ STEP 1: DOWNLOAD PDF ════════
    const buffer = await downloadPDFFromSupabase(documentId, filePath)

    // ════════ STEP 2: PARSE PDF ════════
    const { text: rawText, pageCount } = await parsePDF(buffer)

    // ════════ STEP 3: DETECT EXTRACTABILITY ════════
    const extractability = detectExtractability(rawText, pageCount)

    // Abort the pipeline early if the PDF is scanned \u2014 no point cleaning unusable text
    if (!extractability.isExtractable) {
      throw new ExtractionError(
        ErrorCodes.SCANNED_PDF,
        extractability.warning || "PDF is not text-extractable"
      )
    }

    // ════════ STEP 4: CLEAN TEXT ════════
    const cleanedText = processExtractedText(rawText)

    // ════════ STEP 4.5: VALIDATE TEXT QUALITY ════════
    console.log("[EXTRACT] STEP 4.5: Validating text quality for AI consumption")
    const qualityCheck = validateTextQuality(cleanedText)
    
    console.log("[EXTRACT] Quality validation results:")
    console.log("[EXTRACT]   Valid:", qualityCheck.valid)
    console.log("[EXTRACT]   Word count:", qualityCheck.metrics.wordCount)
    console.log("[EXTRACT]   Alphanumeric ratio:", qualityCheck.metrics.alphanumericRatio.toFixed(2))
    console.log("[EXTRACT]   Sentence count:", qualityCheck.metrics.sentenceCount)
    console.log("[EXTRACT]   Avg word length:", qualityCheck.metrics.avgWordLength.toFixed(2))
    
    if (!qualityCheck.valid) {
      console.error("[EXTRACT] \u2717 Text quality validation FAILED")
      console.error("[EXTRACT] Reason:", qualityCheck.reason)
      
      // Log a preview of the problematic extracted text to aid debugging
      const preview = cleanedText.substring(0, 500)
      console.error("[EXTRACT] Extracted text preview:", preview)
      
      throw new ExtractionError(
        ErrorCodes.INVALID_CONTENT,
        `Text quality validation failed: ${qualityCheck.reason}. The PDF may be scanned, corrupted, or contain non-textual content.`
      )
    }
    
    console.log("[EXTRACT] \u2713 Text quality validation passed")
    
    // Remove any remaining encoding artefacts before passing to AI models
    const sanitizedText = sanitizeTextForAI(cleanedText)
    console.log("[EXTRACT]   Sanitized text length:", sanitizedText.length)

    // ════════ STEP 5: CHUNK TEXT ════════
    const chunks = generateChunks(sanitizedText)

    // ════════ STEP 6: STORE CHUNKS ════════
    console.log("[EXTRACT] STEP 6: Storing chunks in database")

    // Guard: service key required for chunk storage (bypasses RLS)
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new ExtractionError(
        ErrorCodes.SUPABASE_CONFIG_MISSING,
        "Supabase configuration missing for chunk storage"
      )
    }

    // Create admin client specifically for chunk insertion (bypasses RLS)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    const storageResult = await storeChunks(supabaseClient, documentId, userId, chunks)

    if (!storageResult.success) {
      throw new ExtractionError(ErrorCodes.STORAGE_FAILED, "Failed to store chunks", storageResult.error)
    }

    console.log("[EXTRACT] \u2713 Chunks stored successfully")

    // ════════ UPDATE DOCUMENT STATUS ════════
    console.log("[EXTRACT] Updating document status to 'ready'")

    const updateResult = await supabaseClient
      .from("documents")
      .update({
        status:     "ready",              // Mark document as fully processed and available
        page_count: pageCount,            // Store page count for display in the UI
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)

    if (updateResult.error) {
      // Log but don't fail \u2014 chunks are stored and usable even if this metadata update fails
      console.error("[EXTRACT] Warning: Failed to update document status:", updateResult.error)
    }

    // ════════ VALIDATION & STATS ════════
    const validation = validateExtraction(cleanedText, pageCount)  // Final quality summary
    const duration = Date.now() - startTime                         // Total pipeline time in ms

    console.log(
      "\n[EXTRACT] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550"
    )
    console.log("[EXTRACT] EXTRACTION COMPLETED SUCCESSFULLY")
    console.log("[EXTRACT] Duration:", duration, "ms")
    console.log("[EXTRACT] Extraction quality:", validation.quality)
    console.log("[EXTRACT] Total tokens:", validation.estimatedTokens)
    console.log("[EXTRACT] Total chunks:", validation.chunkCount)
    console.log(
      "[EXTRACT] \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n"
    )

    // Return all stats to the client so the upload dialog can show "X pages"
    return NextResponse.json({
      success: true,
      documentId,
      extractedTextLength: cleanedText.length,
      pageCount,
      chunkCount:         chunks.length,
      totalTokens:        storageResult.totalTokens,
      extractionQuality:  validation.quality,
      isScanned:          validation.isScanned,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime  // Still capture duration even on failure

    if (error instanceof ExtractionError) {
      // Typed error: return structured JSON with error code for client-side handling
      console.error(
        "\n[EXTRACT] \u274c EXTRACTION FAILED:",
        error.code,
        "-",
        error.message
      )
      if (error.details) {
        console.error("[EXTRACT] Details:", error.details)
      }
      console.error("[EXTRACT] Duration:", duration, "ms\n")

      return NextResponse.json(
        {
          success:   false,
          error:     error.message,
          errorCode: error.code,   // Machine-readable code for client error mapping
          details:   error.details,
          duration,
        },
        { status: 400 }
      )
    }

    // Untyped / unexpected error \u2014 return 500 with minimal details
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("\n[EXTRACT] \u274c UNEXPECTED ERROR:", errorMessage)
    console.error("[EXTRACT] Duration:", duration, "ms\n")

    return NextResponse.json(
      {
        success: false,
        error:   "Unexpected extraction error",
        details: errorMessage,
        duration,
      },
      { status: 500 }
    )
  }
}
