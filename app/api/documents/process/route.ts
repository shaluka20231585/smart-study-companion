import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    // Document processing is handled by the extract endpoint
    // This route is kept for backward compatibility
    return NextResponse.json({ 
      success: true, 
      message: "Document queued for processing",
      documentId 
    })
  } catch (error) {
    console.error("Error processing document:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
