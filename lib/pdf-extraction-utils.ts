// ============================================================================
// PDF Extraction Utilities
// ============================================================================
// Text cleaning, chunking, and token calculation utilities

/**
 * Step 4: Clean extracted text
 * - Remove null bytes and invalid characters
 * - Remove repeated line breaks
 * - Remove page headers/footers
 * - Normalize whitespace
 * - Preserve paragraph structure
 */
export function cleanExtractedText(text: string): string {
  if (!text) return ""

  // Remove null bytes and other invalid Unicode characters
  let cleaned = text.replace(/\0/g, "")
  cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")

  // Remove multiple consecutive line breaks (keep max 2)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  // Remove common header/footer patterns
  cleaned = cleaned.replace(/^.*?page\s+\d+.*?$/gim, "")
  cleaned = cleaned.replace(/^\d+\s*$\n/gm, "")

  // Normalize multiple spaces to single space (but preserve line structure)
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ")

  // Remove leading/trailing whitespace on each line
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")

  // Fix spacing around common punctuation
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, "$1")
  cleaned = cleaned.replace(/([.,!?;:])\s+([a-zA-Z])/g, "$1 $2")

  return cleaned.trim()
}

/**
 * Step 5: Calculate token count (rough approximation)
 * OpenAI uses ~4 characters per token on average for English
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4)
}

/**
 * Step 5: Split text into chunks with overlap
 * - ~800 tokens per chunk
 * - 100-token overlap between chunks
 * - Preserve sentence boundaries
 */
export function chunkText(
  text: string,
  targetTokensPerChunk: number = 800,
  overlapTokens: number = 100
): string[] {
  if (!text) return []

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  const chunks: string[] = []
  let currentChunk = ""
  let currentTokens = 0
  let overlapText = ""

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence)

    // If adding this sentence would exceed limit, save current chunk
    if (currentTokens + sentenceTokens > targetTokensPerChunk && currentChunk) {
      chunks.push(currentChunk.trim())

      // Prepare overlap: use end of current chunk for next chunk's start
      const overlapLength = Math.ceil((overlapTokens * 4) / 1) // Convert tokens back to chars
      overlapText = currentChunk.slice(-Math.min(overlapLength, currentChunk.length))

      currentChunk = overlapText + " " + sentence
      currentTokens = estimateTokenCount(currentChunk)
    } else {
      currentChunk += sentence
      currentTokens = estimateTokenCount(currentChunk)
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Step 3: Detect non-extractable PDFs
 * If text is too short, likely a scanned PDF
 */
export function detectScannedPDF(text: string, minCharThreshold: number = 500): boolean {
  return text.length < minCharThreshold
}

/**
 * Validate if text is human-readable and suitable for AI processing
 * Returns { valid: boolean, reason?: string, metrics: object }
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
  const metrics = {
    length: text.length,
    wordCount: 0,
    alphanumericRatio: 0,
    sentenceCount: 0,
    avgWordLength: 0,
    hasReadableContent: false,
  }

  // Check minimum length
  if (text.length < 500) {
    return {
      valid: false,
      reason: "Text too short - likely a scanned PDF or extraction failed",
      metrics,
    }
  }

  // Count alphanumeric vs non-alphanumeric characters
  const alphanumeric = text.match(/[a-zA-Z0-9]/g) || []
  const alphanumericCount = alphanumeric.length
  metrics.alphanumericRatio = alphanumericCount / text.length

  // Check if text has excessive non-alphanumeric characters (corrupted encoding)
  if (metrics.alphanumericRatio < 0.4) {
    return {
      valid: false,
      reason: "Text contains excessive non-readable characters - likely encoding corruption",
      metrics,
    }
  }

  // Extract words (sequences of letters)
  const words = text.match(/\b[a-zA-Z]{2,}\b/g) || []
  metrics.wordCount = words.length

  // Check minimum word count
  if (metrics.wordCount < 50) {
    return {
      valid: false,
      reason: "Insufficient readable words - content may be corrupted or non-textual",
      metrics,
    }
  }

  // Calculate average word length
  if (words.length > 0) {
    metrics.avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
  }

  // Check if average word length is reasonable (2-15 characters)
  if (metrics.avgWordLength < 2 || metrics.avgWordLength > 15) {
    return {
      valid: false,
      reason: "Abnormal word lengths detected - possible encoding issue",
      metrics,
    }
  }

  // Check for readable sentences (text with proper punctuation)
  const sentences = text.match(/[A-Z][^.!?]*[.!?]/g) || []
  metrics.sentenceCount = sentences.length

  // Check if text has sentence structure (but be more lenient)
  if (metrics.sentenceCount < 3 && text.length > 1000) {
    return {
      valid: false,
      reason: "Text lacks proper sentence structure",
      metrics,
    }
  }

  // Check for common PDF metadata/binary patterns that indicate bad extraction
  const hasMetadataPatterns =
    /(\/Type\/Font|\/Subtype\/TrueType|\/BaseFont|endstream|endobj|<<)/g.test(text)

  if (hasMetadataPatterns) {
    // Only fail if there's a LOT of metadata (some is OK)
    const metadataMatches = text.match(/(\/Type\/Font|\/Subtype\/TrueType|\/BaseFont|endstream|endobj|<<)/g) || []
    if (metadataMatches.length > 20) {
      return {
        valid: false,
        reason: "Text contains excessive PDF metadata/binary structures - extraction failed to get readable content",
        metrics,
      }
    }
  }

  metrics.hasReadableContent = true

  return {
    valid: true,
    metrics,
  }
}

/**
 * Clean and normalize text for AI consumption
 * More aggressive cleaning to remove any remaining artifacts
 */
export function sanitizeTextForAI(text: string): string {
  // Remove any remaining PDF artifacts
  let cleaned = text.replace(/\/[A-Z][a-zA-Z0-9]*/g, "") // Remove PDF commands like /Type /Font
  cleaned = cleaned.replace(/<<.*?>>/g, "") // Remove PDF dictionaries
  cleaned = cleaned.replace(/endstream|endobj/g, "") // Remove PDF keywords

  // Remove excessive special characters
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s.,!?;:()\-'"\n]/g, " ")

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ")
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n")

  // Remove lines that are just numbers or single characters
  cleaned = cleaned
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed.length > 3 && /[a-zA-Z]/.test(trimmed)
    })
    .join("\n")

  return cleaned.trim()
}

/**
 * Validate extraction quality
 */
export function validateExtraction(text: string, pageCount: number) {
  const qualityCheck = validateTextQuality(text)

  return {
    textLength: text.length,
    pageCount,
    isScanned: detectScannedPDF(text),
    estimatedTokens: estimateTokenCount(text),
    chunkCount: chunkText(text).length,
    quality:
      text.length > 5000 && qualityCheck.valid
        ? "high"
        : text.length > 500 && qualityCheck.valid
          ? "medium"
          : text.length > 100
            ? "low"
            : "unextractable",
    isValid: qualityCheck.valid,
    validationReason: qualityCheck.reason,
    metrics: qualityCheck.metrics,
  }
}
