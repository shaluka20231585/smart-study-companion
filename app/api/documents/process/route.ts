/**
 * Document Processing API Route  POST /api/documents/process
 *
 * NOTE: This route is a legacy stub kept for backward compatibility.
 * All real processing (PDF extraction, chunking, storage) is done
 * by the /api/documents/extract route instead.
 */

// NextResponse: Helper to build JSON HTTP responses
import { NextResponse } from "next/server"

// POST handler — Next.js App Router routes POST /api/documents/process here
export async function POST(request: Request) {
  try {
    // Parse the request body to get the document ID
    const { documentId } = await request.json()

    // Guard: documentId is required to identify which document to process
    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
      // HTTP 400 Bad Request — the client didn't provide a document ID
    }

    // Actual PDF processing (extraction, chunking, storing) happens in /api/documents/extract
    // This endpoint simply acknowledges the request and returns success
    return NextResponse.json({ 
      success: true, 
      message: "Document queued for processing",
      documentId  // Echo back the document ID for client-side reference
    })
  } catch (error) {
    // Log the error server-side and return a generic 500 to the client
    console.error("Error processing document:", error)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }
}
