// ============================================================================
// PDF Extraction Utilities
// ============================================================================
// Pure functions for text cleaning, chunking, quality validation, and token estimation.
// These are used by the /api/documents/extract pipeline after unpdf parses a PDF.

/**
 * cleanExtractedText — Step 4 of the PDF pipeline
 * Takes raw text from unpdf and returns clean, well-structured text
 * suitable for chunking and AI consumption.
 *
 * Operations performed (in order):
 *  1. Remove null bytes and non-printable control characters
 *  2. Collapse 3+ consecutive newlines down to 2 (preserve paragraph breaks)
 *  3. Remove common page header/footer patterns (e.g. "Page 3")
 *  4. Collapse multiple spaces/tabs to a single space
 *  5. Trim whitespace from each line and drop empty lines
 *  6. Fix spacing around punctuation characters
 */
export function cleanExtractedText(text: string): string {
  if (!text) return "" // Bail out early for empty input

  // Remove the null character (\0) which breaks string operations
  let cleaned = text.replace(/\0/g, "")
  // Remove other non-printable control characters (except newline \n and tab \t)
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")

  // Compress 3 or more consecutive blank lines into a single blank line
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  // Remove lines that look like page numbers or page headers, e.g. "Page 3" or "page 12"
  cleaned = cleaned.replace(/^.*?page\s+\d+.*?$/gim, "")
  // Remove lines that contain only digits (e.g. standalone page numbers)
  cleaned = cleaned.replace(/^\d+\s*$\n/gm, "")

  // Replace runs of spaces or tabs with a single space
  // Note: \n is not included here so paragraph structure is preserved
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ")

  // Split into lines, trim each one, discard empty lines, then rejoin
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())         // Remove leading/trailing whitespace per line
    .filter((line) => line.length > 0) // Drop blank lines
    .join("\n")

  // Remove space before punctuation (e.g. "word ," → "word,")
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, "$1")
  // Ensure a single space after punctuation followed by a letter (e.g. "end.Start" → "end. Start")
  cleaned = cleaned.replace(/([.,!?;:])\s+([a-zA-Z])/g, "$1 $2")

  return cleaned.trim() // Remove leading/trailing whitespace from the entire result
}

/**
 * estimateTokenCount — Rough token count approximation
 * OpenAI GPT models use ~4 characters per token for English text.
 * This avoids importing the full `tiktoken` library just for an estimate.
 */
export function estimateTokenCount(text: string): number {
  // 1 token ≈ 4 characters — ceiling ensures we never undercount
  return Math.ceil(text.length / 4)
}

/**
 * chunkText — Step 5 of the PDF pipeline
 * Splits a long text into overlapping chunks suitable for AI context windows.
 *
 * Why overlap? If a concept spans a chunk boundary, the overlap ensures
 * both surrounding chunks contain it, so a keyword search will find it.
 *
 * Algorithm:
 *  - Split text into sentences (using `.!?` as delimiters)
 *  - Accumulate sentences into a chunk until it would exceed targetTokensPerChunk
 *  - When the limit is reached, save the chunk and start a new one
 *    seeded with `overlapTokens` worth of text from the end of the previous chunk
 *
 * @param text                  — Cleaned text to split
 * @param targetTokensPerChunk  — Approximate max tokens per chunk (default: 800)
 * @param overlapTokens         — Tokens to carry over between chunks (default: 100)
 */
export function chunkText(
  text: string,
  targetTokensPerChunk: number = 800,
  overlapTokens: number = 100
): string[] {
  if (!text) return [] // Return empty array for empty input

  // Split on sentence-ending punctuation; fall back to the whole text as one "sentence"
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks: string[] = []    // Accumulated list of completed chunks
  let currentChunk = ""          // Text being built for the current chunk
  let currentTokens = 0          // Token count for the current chunk
  let overlapText = ""           // Carry-over text from the previous chunk

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence)

    // If adding this sentence would overflow the target, finalise the current chunk
    if (currentTokens + sentenceTokens > targetTokensPerChunk && currentChunk) {
      chunks.push(currentChunk.trim()) // Save the completed chunk

      // Calculate how many characters the overlap represents
      // overlapTokens * 4 converts tokens back to approximate character count
      const overlapLength = Math.ceil((overlapTokens * 4) / 1)
      // Take the last `overlapLength` characters of the current chunk as the seed for the next
      overlapText = currentChunk.slice(-Math.min(overlapLength, currentChunk.length))

      // Start the new chunk with the overlap text plus the current sentence
      currentChunk = overlapText + " " + sentence
      currentTokens = estimateTokenCount(currentChunk)
    } else {
      // Sentence fits — append it to the current chunk
      currentChunk += sentence
      currentTokens = estimateTokenCount(currentChunk)
    }
  }

  // Don't forget the last chunk (it may not have hit the size limit)
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * detectScannedPDF — Step 3 of the PDF pipeline
 * Heuristic check: if the extracted text is shorter than a threshold,
 * the PDF is probably a scanned image and OCR would be needed (not supported).
 */
export function detectScannedPDF(text: string, minCharThreshold: number = 500): boolean {
  return text.length < minCharThreshold // True means likely scanned
}

/**
 * validateTextQuality — Deep validation of extracted text before AI processing
 * Returns a detailed result object so callers can communicate the failure reason to users.
 *
 * Checks performed:
 *  1. Minimum length (500 chars)
 *  2. Alphanumeric ratio >= 40% (rejects binary/corrupted data)
 *  3. Minimum word count (50 words)
 *  4. Average word length between 2–15 chars
 *  5. At least 3 readable sentences (for texts > 1000 chars)
 *  6. No excessive PDF binary metadata patterns
 */
export function validateTextQuality(text: string): {
  valid: boolean
  reason?: string
  metrics: {
    length: number
    wordCount: number
    alphanumericRatio: number
    sentenceCount: number
    avgWordLength: number
    hasReadableContent: boolean
  }
} {
  // Start with all-zero metrics; filled in as each check passes
  const metrics = {
    length: text.length,
    wordCount: 0,
    alphanumericRatio: 0,
    sentenceCount: 0,
    avgWordLength: 0,
    hasReadableContent: false,
  }

  // Check 1: Minimum length — too short means scanned PDF or failed extraction
  if (text.length < 500) {
    return {
      valid: false,
      reason: "Text too short - likely a scanned PDF or extraction failed",
      metrics,
    }
  }

  // Check 2: Alphanumeric ratio — detect binary/corrupted data
  const alphanumeric = text.match(/[a-zA-Z0-9]/g) || []
  const alphanumericCount = alphanumeric.length
  metrics.alphanumericRatio = alphanumericCount / text.length

  if (metrics.alphanumericRatio < 0.4) {
    return {
      valid: false,
      reason: "Text contains excessive non-readable characters - likely encoding corruption",
      metrics,
    }
  }

  // Check 3: Word count — extract actual words (2+ letter sequences)
  const words = text.match(/\b[a-zA-Z]{2,}\b/g) || []
  metrics.wordCount = words.length

  if (metrics.wordCount < 50) {
    return {
      valid: false,
      reason: "Insufficient readable words - content may be corrupted or non-textual",
      metrics,
    }
  }

  // Check 4: Average word length — reasonable range is 2–15 characters per word
  if (words.length > 0) {
    metrics.avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
  }

  if (metrics.avgWordLength < 2 || metrics.avgWordLength > 15) {
    return {
      valid: false,
      reason: "Abnormal word lengths detected - possible encoding issue",
      metrics,
    }
  }

  // Check 5: Sentence structure — look for capitalised sentences ending in punctuation
  const sentences = text.match(/[A-Z][^.!?]*[.!?]/g) || []
  metrics.sentenceCount = sentences.length

  // Only fail for long texts without sentences (short texts can lack punctuation)
  if (metrics.sentenceCount < 3 && text.length > 1000) {
    return {
      valid: false,
      reason: "Text lacks proper sentence structure",
      metrics,
    }
  }

  // Check 6: PDF binary patterns — these appear when unpdf fails to decode a page correctly
  const hasMetadataPatterns =
    /(\/Type\/Font|\/Subtype\/TrueType|\/BaseFont|endstream|endobj|<<)/g.test(text)

  if (hasMetadataPatterns) {
    // A few metadata tokens are OK (some PDFs embed them inline)
    // Only fail if there are more than 20 matches (indicates mostly binary content)
    const metadataMatches = text.match(/(\/Type\/Font|\/Subtype\/TrueType|\/BaseFont|endstream|endobj|<<)/g) || []
    if (metadataMatches.length > 20) {
      return {
        valid: false,
        reason: "Text contains excessive PDF metadata/binary structures - extraction failed to get readable content",
        metrics,
      }
    }
  }

  // All checks passed — mark content as readable
  metrics.hasReadableContent = true

  return {
    valid: true,
    metrics,
  }
}

/**
 * sanitizeTextForAI — Final cleaning pass before sending text to OpenAI
 * More aggressive than cleanExtractedText: removes any lingering PDF artifacts
 * that would confuse or waste tokens in an AI prompt.
 */
export function sanitizeTextForAI(text: string): string {
  // Remove PDF command tokens like /Type, /Font, /Subtype
  let cleaned = text.replace(/\/[A-Z][a-zA-Z0-9]*/g, "")
  // Remove PDF dictionary markers << ... >>
  cleaned = cleaned.replace(/<<.*?>>/g, "")
  // Remove PDF stream keywords
  cleaned = cleaned.replace(/endstream|endobj/g, "")

  // Strip any remaining special characters that aren't part of normal prose
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,!?;:()\-'"\n]/g, " ")

  // Collapse multiple spaces/newlines back to single whitespace
  cleaned = cleaned.replace(/\s+/g, " ")
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  // Remove lines that are only numbers or very short (e.g. stray page numbers)
  cleaned = cleaned
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim()
      // Keep only lines with more than 3 chars that contain at least one letter
      return trimmed.length > 3 && /[a-zA-Z]/.test(trimmed)
    })
    .join("\n")

  return cleaned.trim()
}

/**
 * validateExtraction — High-level summary of an extraction result
 * Returns a `quality` rating (high | medium | low | unextractable) plus
 * metadata used by the /extract API to decide whether to mark the document as ready.
 */
export function validateExtraction(text: string, pageCount: number) {
  const qualityCheck = validateTextQuality(text) // Run the full quality check

  return {
    textLength: text.length,
    pageCount,
    isScanned: detectScannedPDF(text),              // True if text is too short for a real PDF
    estimatedTokens: estimateTokenCount(text),       // Rough token count for the full text
    chunkCount: chunkText(text).length,              // How many chunks this text produces
    // Assign quality tier based on text length and validity
    quality:
      text.length > 5000 && qualityCheck.valid
        ? "high"       // Long, valid text
        : text.length > 500 && qualityCheck.valid
          ? "medium"   // Short but valid text
          : text.length > 100
            ? "low"           // Very short — might be mostly images
            : "unextractable", // Essentially empty
    isValid: qualityCheck.valid,                     // Did all quality checks pass?
    validationReason: qualityCheck.reason,           // Human-readable reason if invalid
    metrics: qualityCheck.metrics,                   // Detailed metrics for debugging
  }
}
