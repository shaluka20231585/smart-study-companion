// Marks this as a Client Component — required for hooks and browser APIs
"use client"

// React: needed because JSX compiles to React.createElement calls
import React from "react"

// useState: Local state for input text, document list, and selection
// useEffect: Side effects for fetching documents and auto-scrolling
// useRef: Holds a reference to the scroll container DOM node
// Suspense: Wraps the content component so useSearchParams is safe for SSR
import { useState, useEffect, useRef, Suspense, useMemo } from "react"

// useSearchParams: Reads URL query params (e.g. ?document=abc) without a page reload
import { useSearchParams } from "next/navigation"

// useChat: AI SDK hook that manages the message list, streaming state, and sendMessage
import { useChat } from "@ai-sdk/react"

// DefaultChatTransport: Configures where and how chat messages are sent to the backend
import { DefaultChatTransport } from "ai"

// useAuth: Provides the current user's ID for scoping document queries
import { useAuth } from "@/contexts/auth-context"

// toast: Non-blocking notification (success/error)
import { toast } from "sonner"

// getDocuments: Fetches all documents for a user
// getDocumentContent: Fetches the extracted text content of a single document
import { getDocuments, getDocumentTextFromChunks } from "@/lib/queries"

// shadcn/ui layout and control components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"    // Multi-line text input
import { ScrollArea } from "@/components/ui/scroll-area" // Scrollable container with styled scrollbar
import { Avatar, AvatarFallback } from "@/components/ui/avatar" // User/bot avatar circles
import { Skeleton } from "@/components/ui/skeleton"   // Placeholder while loading
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav" // Navigation breadcrumbs
import {
  Select,          // Root element for the custom dropdown selector
  SelectContent,   // The popup list of options
  SelectItem,      // A single selectable option
  SelectTrigger,   // The visible button that opens the dropdown
  SelectValue,     // Shows the currently selected value inside the trigger
} from "@/components/ui/select"

// Icon imports
import { MessageSquare, Send, Bot, User, FileText, MessageCircle } from "lucide-react"
// MessageSquare: unused import (was for an earlier design, kept for now)
// Send: Icon on the submit button
// Bot: Avatar icon for AI assistant messages
// User: Avatar icon for user messages
// FileText: Icon in the document selector header

// LavaLoader: Animated lava-lamp style orb shown in the chat empty state
import { LavaLoader } from "@/components/ui/lava-loader"

// Document type from our shared type definitions
import type { Document } from "@/lib/types"

// Inner component that uses useSearchParams — must be inside a <Suspense> boundary
function ChatContent() {
  // Read `?document=<id>` from the URL — set when navigating from the Documents page
  const searchParams = useSearchParams()
  const documentIdFromUrl = searchParams.get("document") // null if not present in URL

  // Current logged-in user
  const { user } = useAuth()

  // input: The current text in the textarea (controlled component)
  const [input, setInput] = useState("")

  // documents: All of this user's "ready" documents shown in the dropdown
  const [documents, setDocuments] = useState<Document[]>([])

  // selectedDocumentId: The ID of the document currently selected for context
  // Initialized from the URL param so navigating here from a document pre-selects it
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(documentIdFromUrl)

  // documentContent: The extracted text of the selected document, sent to the API
  const [documentContent, setDocumentContent] = useState<string>("")

  // loadingDocs: True while the document list is being fetched
  const [loadingDocs, setLoadingDocs] = useState(true)

  // loadingContent: True while the selected document's content is being fetched
  const [loadingContent, setLoadingContent] = useState(false)

  // scrollAreaRef: Points to the scrollable message container DOM node
  // Used to programmatically scroll to the bottom when new messages arrive
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // contentRef: Always has the current document content value
  // Used in the transport closure to ensure we're sending the latest content
  const contentRef = useRef<string>("")

  // Update the ref whenever documentContent changes
  useEffect(() => {
    contentRef.current = documentContent
    console.log("[CHAT] Updated contentRef:", {
      hasContent: !!documentContent,
      length: documentContent?.length || 0,
    })
  }, [documentContent])

  // Memoize the transport to prevent recreation on every render
  // This ensures the chat connection remains stable
  const transport = useMemo(
    () => {
      console.log("[CHAT] Creating transport with contentRef:", {
        hasContent: !!contentRef.current,
        length: contentRef.current?.length || 0,
      })
      return new DefaultChatTransport({
        api: "/api/chat", // The route that processes AI chat requests
        // prepareSendMessagesRequest runs before every send; used to inject extra data
        prepareSendMessagesRequest: ({ id, messages }) => {
          console.log("[CHAT] Sending message with contentRef length:", contentRef.current?.length || 0)
          console.log("[CHAT] Sending message with documentContent length:", documentContent?.length || 0)
          return {
            body: {
              id, // Chat session ID (used for server-side history)
              messages, // Full message history including the new user message
              documentContent: contentRef.current, // Use ref to always get latest content
            },
          }
        },
      })
    },
    [] // Never recreate transport; contentRef always has current value
  )

  // useChat: AI SDK hook
  // messages: Array of all chat messages (role: 'user' | 'assistant')
  // sendMessage: Function to send a new user message and start streaming
  // status: 'idle' | 'submitted' | 'streaming' | 'error'
  const { messages, sendMessage, status } = useChat({ transport })

  // True while the AI is generating a response — used to disable inputs
  const isLoading = status === "streaming" || status === "submitted"

  // Fetch all documents belonging to this user after mount
  useEffect(() => {
    async function fetchDocuments() {
      if (!user) return // Skip if not logged in

      try {
        const docs = await getDocuments(user.id)
        // Only show documents that have been fully processed (status === 'ready')
        const readyDocs = (docs || []).filter((d: any) => d.status === "ready")
        setDocuments(readyDocs)
      } catch (error) {
        console.error("Error fetching documents:", error)
      } finally {
        setLoadingDocs(false) // Stop showing the skeleton select input
      }
    }

    fetchDocuments()
  }, [user]) // Re-run if the user changes (e.g. after login)

  // Fetch the full text content of the selected document whenever it changes
  useEffect(() => {
    async function fetchDocumentContent() {
      if (!selectedDocumentId) {
        console.log("[CHAT] No document selected, clearing content")
        setDocumentContent("") // Clear content when "No document" is selected
        setLoadingContent(false)
        return
      }

      // Mark as loading before fetching
      setLoadingContent(true)

      try {
        console.log("[CHAT] Fetching content for document:", selectedDocumentId)
        // Reconstruct full document text from stored chunks (this is what gets saved during extraction)
        const fullText = await getDocumentTextFromChunks(selectedDocumentId)
        console.log("[CHAT] Fetched content length:", fullText.length)
        if (fullText.length > 0) {
          console.log("[CHAT] Content preview:", fullText.substring(0, 100))
        }
        setDocumentContent(fullText)
      } catch (error) {
        console.error("[CHAT] Error fetching document content:", error)
        toast.error("Failed to load document content for chat")
        setDocumentContent("") // Clear on error so AI falls back to general mode
      } finally {
        // Mark as done loading
        setLoadingContent(false)
      }
    }

    fetchDocumentContent()
  }, [selectedDocumentId]) // Re-run whenever a different document is selected

  // Scroll the message container to the bottom every time the messages array changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      // scrollHeight is the full scrollable height; setting scrollTop to it jumps to the end
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Called when the user clicks Send or presses Enter
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()                    // Prevent the browser from reloading the page
    if (!input.trim() || isLoading) return // Don't send empty messages or while streaming
    sendMessage({ text: input })          // Send the message via the AI SDK
    setInput("")                          // Clear the textarea after sending
  }

  // Keyboard shortcut: Enter sends, Shift+Enter inserts a newline
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault() // Prevent default newline behaviour
      handleSubmit(e)    // Treat as form submit
    }
  }

  /**
   * Extracts the plain text string from a message's `parts` array.
   * The AI SDK represents message content as an array of typed parts
   * (text, tool-call, tool-result, etc.). We filter to only text parts
   * and join them to get the full readable message string.
   */
  const getMessageText = (message: (typeof messages)[0]) => {
    return message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text") // Keep only text parts
      .map((p) => p.text)   // Extract the string from each text part
      .join("") || ""        // Combine all parts; fallback to empty string
  }

  return (
    // Height fills viewport minus the header; pb-20 reserves space for mobile nav bar
    <div className="flex flex-col h-[calc(100vh-8rem)] pb-20 lg:pb-0">

      {/* Breadcrumb navigation */}
      <BreadcrumbNav items={[{ label: "AI Tutor", icon: <MessageCircle className="h-4 w-4" /> }]} />

      {/* Page heading */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Study Tutor</h1>
          <p className="text-muted-foreground mt-1">
            Get instant help with your documents and study materials
          </p>
        </div>
      </div>

      {/* ── DOCUMENT SELECTOR CARD ── */}
      <Card className="mb-4 border-primary/20 shadow-sm">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">Document Context</CardTitle>
              <CardDescription className="text-xs">
                Select a document to chat about specific content
              </CardDescription>
            </div>
            {/* Show a skeleton while the doc list loads, then show the real select */}
            {loadingDocs ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedDocumentId || "none"}  // "none" represents no selection
                  onValueChange={(value) =>
                    // Convert "none" back to null so the API knows there's no doc context
                    setSelectedDocumentId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select a document" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No document</SelectItem>
                    {/* Render one option per ready document */}
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Status badge showing content loading state */}
                {selectedDocumentId && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs font-medium whitespace-nowrap">
                    {loadingContent ? (
                      <>
                        <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        Loading...
                      </>
                    ) : documentContent.length > 0 ? (
                      <>
                        <span className="text-green-600">✓</span>
                        {(documentContent.length / 1000).toFixed(1)}K chars
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* ── CHAT AREA CARD ── */}
      {/* flex-1 makes this card take up all remaining vertical space */}
      <Card className="flex-1 flex flex-col min-h-0">
        {/* ScrollArea holds the message history; ref lets us scroll to the bottom */}
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            // ── EMPTY STATE: shown before any messages are sent ──
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              {/* Animated lava-lamp orb — replaces the static Sparkles icon */}
              <div className="mb-6">
                <LavaLoader />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground max-w-sm">
                {/* The hint text changes depending on whether a document is selected */}
                {selectedDocumentId
                  ? "Ask me anything about your selected document. I can help explain concepts, summarize content, or answer specific questions."
                  : "Select a document above to get context-aware help, or ask me general study questions."}
              </p>
              {/* Suggestion chips — clicking one populates the input field */}
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {selectedDocumentId ? (
                  <>
                    {/* Document-specific suggestions */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("Summarize the main topics in this document")
                      }}
                    >
                      Summarize main topics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("What are the key concepts I should understand?")
                      }}
                    >
                      Key concepts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("Create a study outline for this material")
                      }}
                    >
                      Create study outline
                    </Button>
                  </>
                ) : (
                  <>
                    {/* General study suggestions shown when no document is selected */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("Give me some effective study techniques")
                      }}
                    >
                      Study techniques
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInput("How can I improve my memory retention?")
                      }}
                    >
                      Memory tips
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            // ── MESSAGE LIST ──
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  // User messages appear on the right; assistant messages on the left
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Avatar only shown on the LEFT side for assistant messages */}
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {/* Message bubble — primary background for user, muted for assistant */}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"  // User: filled accent color
                        : "bg-muted"                            // Assistant: subtle background
                    }`}
                  >
                    {/* whitespace-pre-wrap preserves newlines in multi-line responses */}
                    <p className="text-sm whitespace-pre-wrap">{getMessageText(message)}</p>
                  </div>
                  {/* Avatar only shown on the RIGHT side for user messages */}
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {/* ── TYPING INDICATOR ── shown while the AI is generating a response */}
              {/* Only show if we're loading AND the last message was from the user */}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    {/* Three bouncing dots with staggered delays for the animated ellipsis */}
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }} // Second dot starts 0.1s later
                      />
                      <span
                        className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }} // Third dot starts 0.2s later
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* ── INPUT AREA ── fixed at the bottom of the chat card */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}                          // Controlled component — reflects state
              onChange={(e) => setInput(e.target.value)} // Update state on every keystroke
              onKeyDown={handleKeyDown}              // Enter sends, Shift+Enter adds a newline
              placeholder="Ask your AI tutor..."
              className="min-h-[44px] max-h-32 resize-none" // Fixed min height, scrollable
              disabled={isLoading}                   // Prevent input while AI is responding
            />
            {/* Disabled when input is empty or streaming is in progress */}
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span> {/* Accessibility label */}
            </Button>
          </form>
          {/* Helper text reminding users of the keyboard shortcut */}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  )
}

/**
 * ChatPage — default export
 * Wraps ChatContent in a Suspense boundary because useSearchParams() requires one
 * when the page is server-rendered. Without Suspense, Next.js would throw an error.
 */
export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageSkeleton />}>
      <ChatContent />
    </Suspense>
  )
}

/**
 * ChatPageSkeleton — shown while ChatContent is suspending
 * Provides a rough layout placeholder matching the real page structure
 */
function ChatPageSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] pb-20 lg:pb-0">
      {/* Page heading skeleton */}
      <div className="mb-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>
      {/* Document selector card skeleton */}
      <Skeleton className="h-20 w-full mb-4" />
      {/* Chat area skeleton — flex-1 fills remaining space */}
      <Skeleton className="flex-1 w-full" />
    </div>
  )
}
