"use client"

import React from "react"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useAuth } from "@/contexts/auth-context"
import { getDocuments, getDocumentContent } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MessageSquare, Send, Bot, User, FileText, Sparkles } from "lucide-react"
import type { Document } from "@/lib/types"

function ChatContent() {
  const searchParams = useSearchParams()
  const documentIdFromUrl = searchParams.get("document")
  const { user } = useAuth()
  const [input, setInput] = useState("")
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(documentIdFromUrl)
  const [documentContent, setDocumentContent] = useState<string>("")
  const [loadingDocs, setLoadingDocs] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Create custom transport with document content
  const transport = new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: {
        id,
        messages,
        documentContent,
      },
    }),
  })

  const { messages, sendMessage, status } = useChat({ transport })

  const isLoading = status === "streaming" || status === "submitted"

  // Fetch user's documents
  useEffect(() => {
    async function fetchDocuments() {
      if (!user) return

      try {
        const docs = await getDocuments(user.id)
        const readyDocs = (docs || []).filter((d: any) => d.status === "ready")
        setDocuments(readyDocs)
      } catch (error) {
        console.error("Error fetching documents:", error)
      } finally {
        setLoadingDocs(false)
      }
    }

    fetchDocuments()
  }, [user])

  // Fetch document content when selection changes
  useEffect(() => {
    async function fetchDocumentContent() {
      if (!selectedDocumentId) {
        setDocumentContent("")
        return
      }

      try {
        const contentData = await getDocumentContent(selectedDocumentId)
        if (contentData) {
          setDocumentContent(contentData.text || "")
        }
      } catch (error) {
        console.error("Error fetching document content:", error)
      }
    }

    fetchDocumentContent()
  }, [selectedDocumentId])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const getMessageText = (message: (typeof messages)[0]) => {
    return message.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") || ""
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] pb-20 lg:pb-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Tutor</h1>
          <p className="text-muted-foreground">
            Chat with your AI study assistant
          </p>
        </div>
      </div>

      {/* Document Selector */}
      <Card className="mb-4">
        <CardHeader className="py-3">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-sm font-medium">Document Context</CardTitle>
              <CardDescription className="text-xs">
                Select a document to chat about specific content
              </CardDescription>
            </div>
            {loadingDocs ? (
              <Skeleton className="h-9 w-48" />
            ) : (
              <Select
                value={selectedDocumentId || "none"}
                onValueChange={(value) =>
                  setSelectedDocumentId(value === "none" ? null : value)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No document</SelectItem>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground max-w-sm">
                {selectedDocumentId
                  ? "Ask me anything about your selected document. I can help explain concepts, summarize content, or answer specific questions."
                  : "Select a document above to get context-aware help, or ask me general study questions."}
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {selectedDocumentId ? (
                  <>
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
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{getMessageText(message)}</p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                      <span
                        className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <span
                        className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your AI tutor..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageSkeleton />}>
      <ChatContent />
    </Suspense>
  )
}

function ChatPageSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] pb-20 lg:pb-0">
      <div className="mb-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>
      <Skeleton className="h-20 w-full mb-4" />
      <Skeleton className="flex-1 w-full" />
    </div>
  )
}
