import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  cleanExtractedText,
  chunkText,
  estimateTokenCount,
  validateExtraction,
  detectScannedPDF,
  validateTextQuality,
  sanitizeTextForAI,
} from "@/lib/pdf-extraction-utils"
import { storeChunks } from "@/lib/chunk-storage"
import { extractText } from "unpdf"

// Robust PDF text extraction using unpdf (works natively in Node.js)
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// ============================================================================
// ERROR DEFINITIONS
// ============================================================================

class ExtractionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = "ExtractionError"
  }
}

const ErrorCodes = {
  SUPABASE_CONFIG_MISSING: "SUPABASE_CONFIG_MISSING",
  MISSING_DOCUMENT_ID: "MISSING_DOCUMENT_ID",
  MISSING_USER_ID: "MISSING_USER_ID",
  DOWNLOAD_FAILED: "DOWNLOAD_FAILED",
  PARSE_FAILED: "PARSE_FAILED",
  EMPTY_PDF: "EMPTY_PDF",
  SCANNED_PDF: "SCANNED_PDF",
  CHUNK_FAILED: "CHUNK_FAILED",
  STORAGE_FAILED: "STORAGE_FAILED",
  INVALID_CONTENT: "INVALID_CONTENT",
}

// ============================================================================
// STEP 1: VALIDATE AND RETRIEVE PDF FROM SUPABASE
// ============================================================================

async function downloadPDFFromSupabase(
  documentId: string,
  filePath: string
): Promise<Buffer> {
  console.log("[EXTRACT] STEP 1: Retrieving PDF from Supabase Storage")
  console.log("[EXTRACT] Document ID:", documentId)
  console.log("[EXTRACT] File path:", filePath)

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new ExtractionError(
      ErrorCodes.SUPABASE_CONFIG_MISSING,
      "Supabase configuration missing (URL or Service Key)",
      { supabaseUrl, hasServiceKey: !!supabaseServiceKey }
    )
  }

  try {
    // Create admin client with service key (server-side only)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Download PDF as binary data
    const { data, error } = await supabaseAdmin.storage.from("documents").download(filePath)

    if (error || !data) {
      throw new ExtractionError(
        ErrorCodes.DOWNLOAD_FAILED,
        `Failed to download PDF from Supabase: ${error?.message}`,
        { error }
      )
    }

    // Convert to Node.js Buffer explicitly
    // Supabase returns a Blob, convert to ArrayBuffer, then to Buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Validate buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Failed to create valid Node.js Buffer from downloaded data")
    }

    console.log("[EXTRACT] ✓ PDF downloaded successfully")
    console.log("[EXTRACT]   Size:", buffer.length, "bytes")
    console.log("[EXTRACT]   First bytes (hex):", buffer.slice(0, 4).toString("hex"))
    console.log("[EXTRACT]   Is valid Buffer:", Buffer.isBuffer(buffer))

    return buffer
  } catch (error) {
    if (error instanceof ExtractionError) throw error
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

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    // Parse request body
    const body = await request.json()
    console.log("[EXTRACT] Request body received:", body)
    
    const { documentId, userId, filePath } = body

    // Validate inputs
    if (!documentId) {
      throw new ExtractionError(ErrorCodes.MISSING_DOCUMENT_ID, "Document ID is required")
    }

    if (!userId) {
      console.error("[EXTRACT] userId validation failed. Received body:", body)
      throw new ExtractionError(ErrorCodes.MISSING_USER_ID, "User ID is required")
    }

    if (!filePath) {
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
      console.error("[EXTRACT] ✗ Text quality validation FAILED")
      console.error("[EXTRACT] Reason:", qualityCheck.reason)
      
      // Show preview of what was extracted
      const preview = cleanedText.substring(0, 500)
      console.error("[EXTRACT] Extracted text preview:", preview)
      
      throw new ExtractionError(
        ErrorCodes.INVALID_CONTENT,
        `Text quality validation failed: ${qualityCheck.reason}. The PDF may be scanned, corrupted, or contain non-textual content.`
      )
    }
    
    console.log("[EXTRACT] ✓ Text quality validation passed")
    
    // Sanitize text for AI consumption (remove any remaining artifacts)
    const sanitizedText = sanitizeTextForAI(cleanedText)
    console.log("[EXTRACT]   Sanitized text length:", sanitizedText.length)

    // ════════ STEP 5: CHUNK TEXT ════════
    const chunks = generateChunks(sanitizedText)

    // ════════ STEP 6: STORE CHUNKS ════════
    console.log("[EXTRACT] STEP 6: Storing chunks in database")

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new ExtractionError(
        ErrorCodes.SUPABASE_CONFIG_MISSING,
        "Supabase configuration missing for chunk storage"
      )
    }

    // Use service role for server-side chunk storage (bypasses RLS)
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    const storageResult = await storeChunks(supabaseClient, documentId, userId, chunks)

    if (!storageResult.success) {
      throw new ExtractionError(ErrorCodes.STORAGE_FAILED, "Failed to store chunks", storageResult.error)
    }

    console.log("[EXTRACT] ✓ Chunks stored successfully")

    // ════════ UPDATE DOCUMENT STATUS ════════
    console.log("[EXTRACT] Updating document status to 'ready'")

    const updateResult = await supabaseClient
      .from("documents")
      .update({
        status: "ready",
        page_count: pageCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)

    if (updateResult.error) {
      console.error("[EXTRACT] Warning: Failed to update document status:", updateResult.error)
      // Don't throw - chunks are stored, this is just metadata
    }

    // ════════ VALIDATION & STATS ════════
    const validation = validateExtraction(cleanedText, pageCount)
    const duration = Date.now() - startTime

    console.log(
      "\n[EXTRACT] ════════════════════════════════════════════════════════════════"
    )
    console.log("[EXTRACT] EXTRACTION COMPLETED SUCCESSFULLY")
    console.log("[EXTRACT] Duration:", duration, "ms")
    console.log("[EXTRACT] Extraction quality:", validation.quality)
    console.log("[EXTRACT] Total tokens:", validation.estimatedTokens)
    console.log("[EXTRACT] Total chunks:", validation.chunkCount)
    console.log(
      "[EXTRACT] ════════════════════════════════════════════════════════════════\n"
    )

    return NextResponse.json({
      success: true,
      documentId,
      extractedTextLength: cleanedText.length,
      pageCount,
      chunkCount: chunks.length,
      totalTokens: storageResult.totalTokens,
      extractionQuality: validation.quality,
      isScanned: validation.isScanned,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime

    if (error instanceof ExtractionError) {
      console.error(
        "\n[EXTRACT] ❌ EXTRACTION FAILED:",
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
          success: false,
          error: error.message,
          errorCode: error.code,
          details: error.details,
          duration,
        },
        { status: 400 }
      )
    }

    // Unknown error
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("\n[EXTRACT] ❌ UNEXPECTED ERROR:", errorMessage)
    console.error("[EXTRACT] Duration:", duration, "ms\n")

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected extraction error",
        details: errorMessage,
        duration,
      },
      { status: 500 }
    )
  }
}
