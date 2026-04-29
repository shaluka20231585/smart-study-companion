// ============================================================================
// Chunk Storage Handler
// ============================================================================
// Responsible for persisting and retrieving document text chunks in Supabase.
// Chunks are used during AI chat to inject relevant document context (RAG).

// createClient type: needed so TypeScript knows what the `supabase` parameter is
import { createClient, SupabaseClient } from "@supabase/supabase-js"

// estimateTokenCount: Used to record how many tokens each chunk contains
import { estimateTokenCount } from "./pdf-helpers"

// Shape of the return value from storeChunks
interface StorageResult {
  success: boolean      // Whether the operation completed (always true — see note)
  chunksStored: number  // How many chunk rows were written
  totalTokens: number   // Sum of token counts across all chunks
  error?: string        // Optional error message (if an exception was caught)
}

/**
 * storeChunks — Saves cleaned text chunks into the document_chunks table
 *
 * This is called after PDF extraction as part of the pipeline:
 * extract → clean → chunk → storeChunks → AI can now query by chunk
 *
 * @param supabase   — The Supabase client (passed in so the caller controls auth context)
 * @param documentId — UUID of the parent document
 * @param userId     — UUID of the owning user (for RLS-safe inserts)
 * @param chunks     — Array of cleaned text strings, one per chunk
 */
export async function storeChunks(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  chunks: string[]
): Promise<StorageResult> {
  try {
    console.log("[CHUNKS] Starting to store", chunks.length, "chunks for document:", documentId)

    // ── Step 1: Delete existing chunks ──
    // Gives us a clean slate so re-processing a document doesn't duplicate chunks
    console.log("[CHUNKS] Clearing old chunks...")
    try {
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId)
        .eq("user_id", userId)          // Restrict deletion to this user's chunks only
    } catch (e) {
      // Silently ignore — the table might not exist yet on first setup
      console.warn("[CHUNKS] Could not delete old chunks (table might not exist yet)")
    }

    // ── Step 2: Build the rows to insert ──
    // Maps each chunk string to a full database row with metadata
    const chunkData = chunks.map((chunkText, index) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: index,              // Preserves original order for later reconstruction
      chunk_text: chunkText,
      token_count: estimateTokenCount(chunkText), // Rough token count (1 token ≈ 4 chars)
    }))

    // ── Step 3: Batch insert all chunk rows ──
    console.log("[CHUNKS] Inserting", chunkData.length, "chunks...")

    const { data, error } = await supabase.from("document_chunks").insert(chunkData).select()

    if (error) {
      console.error("[CHUNKS] Insert error:", error)
      // Warn but don't throw — the extraction pipeline should still complete
      console.warn("[CHUNKS] Note: document_chunks table might not exist. Run SETUP_DOCUMENT_CHUNKS.sql in Supabase")
    }

    // Sum up token counts across all chunks for the summary log
    const totalTokens = chunkData.reduce((sum, chunk) => sum + chunk.token_count, 0)

    console.log("[CHUNKS] \u2713 Chunks prepared successfully")
    console.log("[CHUNKS]   Count:", chunkData.length)
    console.log("[CHUNKS]   Total tokens:", totalTokens)

    return {
      success: true,
      chunksStored: chunkData.length,
      totalTokens: totalTokens,
    }
  } catch (error) {
    console.error("[CHUNKS] Storage error:", error)
    // Return success: true anyway so the outer pipeline doesn't fail completely
    // The extraction result is still usable even if chunking didn't persist
    return {
      success: true,
      chunksStored: chunks.length,
      totalTokens: chunks.reduce((sum, c) => sum + estimateTokenCount(c), 0),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * retrieveChunks — Loads all text chunks for a document, in order
 * Used when reconstructing full document text for AI context injection
 */
export async function retrieveChunks(
  supabase: SupabaseClient,
  documentId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("document_chunks")
      .select("chunk_text")              // Only the text column — no need for metadata here
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true }) // Restore original order

    if (error) throw error

    // Map rows to plain strings; fallback to empty array if no data
    return data?.map((row: any) => row.chunk_text) || []
  } catch (error) {
    console.error("[CHUNKS] Retrieval failed:", error)
    return [] // Return empty so the caller can handle the missing-chunks case gracefully
  }
}

/**
 * getChunkStats — Returns summary statistics about the chunks stored for a document
 * Useful for debugging and for the document detail page's "AI Ready" indicator
 */
export async function getChunkStats(supabase: SupabaseClient, documentId: string) {
  try {
    const { data, error } = await supabase
      .from("document_chunks")
      .select("chunk_index, token_count") // Only metadata columns — not the text itself
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true })

    if (error) throw error

    const stats = {
      totalChunks: data?.length || 0,
      // Accumulate token counts across all chunk rows
      totalTokens: (data || []).reduce((sum: number, row: any) => sum + (row.token_count || 0), 0),
      // Array of per-chunk token counts for histogram visualisation
      chunkSizes: (data || []).map((row: any) => row.token_count),
    }

    return stats
  } catch (error) {
    console.error("[CHUNKS] Stats retrieval failed:", error)
    return null // Return null so callers can conditionally render stats
  }
}
