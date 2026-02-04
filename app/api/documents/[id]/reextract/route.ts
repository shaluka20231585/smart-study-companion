import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await request.json()

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`[RE-EXTRACT] Starting re-extraction for document ${id}`)

    // 0. Get document info to retrieve file path
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("file_url")
      .eq("id", id)
      .eq("user_id", userId)
      .single()

    if (docError || !document) {
      console.error("[RE-EXTRACT] Error fetching document:", docError)
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    // Extract file path from file_url
    const filePath = document.file_url.split('/documents/')[1]
    if (!filePath) {
      return NextResponse.json(
        { error: "Invalid file URL" },
        { status: 400 }
      )
    }

    console.log(`[RE-EXTRACT] File path: ${filePath}`)

    // 1. Delete existing chunks
    const { error: deleteError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", id)
      .eq("user_id", userId)

    if (deleteError) {
      console.error("[RE-EXTRACT] Error deleting old chunks:", deleteError)
    } else {
      console.log("[RE-EXTRACT] Deleted old chunks")
    }

    // 2. Update document status to trigger re-extraction
    const { error: updateError } = await supabase
      .from("documents")
      .update({ 
        status: "processing",
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", userId)

    if (updateError) {
      console.error("[RE-EXTRACT] Error updating document:", updateError)
      return NextResponse.json(
        { error: "Failed to update document status" },
        { status: 500 }
      )
    }

    console.log("[RE-EXTRACT] Document status updated to processing")

    // 3. Trigger extraction
    const extractUrl = `${request.headers.get("origin")}/api/documents/extract`
    const extractResponse = await fetch(extractUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        documentId: id, 
        userId,
        filePath 
      }),
    })

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json()
      console.error("[RE-EXTRACT] Extraction failed:", errorData)
      return NextResponse.json(
        { error: errorData.error || "Extraction failed" },
        { status: 500 }
      )
    }

    const result = await extractResponse.json()
    console.log("[RE-EXTRACT] Re-extraction completed successfully")

    return NextResponse.json({ 
      success: true, 
      message: "Document re-extracted successfully",
      ...result
    })
  } catch (error) {
    console.error("[RE-EXTRACT] Error:", error)
    return NextResponse.json(
      { error: "Failed to re-extract document" },
      { status: 500 }
    )
  }
}
