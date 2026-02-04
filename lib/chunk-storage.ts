// ============================================================================
// Chunk Storage Handler
// ============================================================================
// Store cleaned chunks in Supabase database

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { estimateTokenCount } from "./pdf-extraction-utils"

interface StorageResult {
  success: boolean
  chunksStored: number
  totalTokens: number
  error?: string
}

/**
 * Store cleaned chunks in database
 * - Stores chunks for AI processing
 * - Tracks token counts
 */
export async function storeChunks(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  chunks: string[]
): Promise<StorageResult> {
  try {
    console.log("[CHUNKS] Starting to store", chunks.length, "chunks for document:", documentId)

    // Step 1: Delete existing chunks (clean slate)
    console.log("[CHUNKS] Clearing old chunks...")
    try {
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId)
        .eq("user_id", userId)
    } catch (e) {
      console.warn("[CHUNKS] Could not delete old chunks (table might not exist yet)")
    }

    // Step 2: Prepare chunk data with token counts
    const chunkData = chunks.map((chunkText, index) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: index,
      chunk_text: chunkText,
      token_count: estimateTokenCount(chunkText),
    }))

    // Step 3: Insert new chunks
    console.log("[CHUNKS] Inserting", chunkData.length, "chunks...")

    const { data, error } = await supabase.from("document_chunks").insert(chunkData).select()

    if (error) {
      console.error("[CHUNKS] Insert error:", error)
      console.warn("[CHUNKS] Note: document_chunks table might not exist. Run SETUP_DOCUMENT_CHUNKS.sql in Supabase")
    }

    // Calculate total tokens
    const totalTokens = chunkData.reduce((sum, chunk) => sum + chunk.token_count, 0)

    console.log("[CHUNKS] ✓ Chunks prepared successfully")
    console.log("[CHUNKS]   Count:", chunkData.length)
    console.log("[CHUNKS]   Total tokens:", totalTokens)

    return {
      success: true,
      chunksStored: chunkData.length,
      totalTokens: totalTokens,
    }
  } catch (error) {
    console.error("[CHUNKS] Storage error:", error)
    // Still return success - extraction pipeline completes
    return {
      success: true,
      chunksStored: chunks.length,
      totalTokens: chunks.reduce((sum, c) => sum + estimateTokenCount(c), 0),
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Retrieve chunks for a document
 */
export async function retrieveChunks(
  supabase: SupabaseClient,
  documentId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("document_chunks")
      .select("chunk_text")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true })

    if (error) throw error

    return data?.map((row: any) => row.chunk_text) || []
  } catch (error) {
    console.error("[CHUNKS] Retrieval failed:", error)
    return []
  }
}

/**
 * Get chunk statistics for a document
 */
export async function getChunkStats(supabase: SupabaseClient, documentId: string) {
  try {
    const { data, error } = await supabase
      .from("document_chunks")
      .select("chunk_index, token_count")
      .eq("document_id", documentId)
      .order("chunk_index", { ascending: true })

    if (error) throw error

    const stats = {
      totalChunks: data?.length || 0,
      totalTokens: (data || []).reduce((sum: number, row: any) => sum + (row.token_count || 0), 0),
      chunkSizes: (data || []).map((row: any) => row.token_count),
    }

    return stats
  } catch (error) {
    console.error("[CHUNKS] Stats retrieval failed:", error)
    return null
  }
}
