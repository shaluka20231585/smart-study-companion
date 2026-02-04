"use client"

import { Spinner } from "@/components/ui/spinner"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getDocumentById, getDocumentContent, getDocumentTextFromChunks, createFlashcardDeck, createFlashcards } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Brain, Sparkles, Save, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { Document, Flashcard } from "@/lib/types"

interface GeneratedFlashcard {
  front: string
  back: string
  difficulty: "easy" | "medium" | "hard"
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function GenerateFlashcardsPage({ params }: PageProps) {
  const { id } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [flashcards, setFlashcards] = useState<GeneratedFlashcard[]>([])
  const [deckName, setDeckName] = useState("")
  const [cardCount, setCardCount] = useState(10)
  const [previewIndex, setPreviewIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    async function fetchDocument() {
      if (!user || !id) return

      try {
        const docData = await getDocumentById(id, user.id)

        if (docData) {
          setDocument(docData as Document)
          setDeckName(`${docData.name} - Flashcards`)

          // Fetch extracted content from chunks
          try {
            const textFromChunks = await getDocumentTextFromChunks(id)
            if (textFromChunks) {
              setContent(textFromChunks)
            } else {
              // Try legacy document_contents table
              try {
                const contentData = await getDocumentContent(id)
                if (contentData) {
                  setContent(contentData.text || "")
                }
              } catch {
                // Content might not exist yet
              }
            }
          } catch {
            // Chunks table might not exist yet
          }
        }
      } catch (error) {
        console.error("Error fetching document:", error)
        toast.error("Failed to load document")
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [user, id])

  const generateFlashcards = async () => {
    if (!content) {
      toast.error("No content available. Please process the document first.")
      return
    }

    setGenerating(true)
    try {
      const response = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, count: cardCount }),
      })

      if (!response.ok) throw new Error("Failed to generate flashcards")

      const data = await response.json()
      setFlashcards(data.flashcards)
      setPreviewIndex(0)
      setShowAnswer(false)
      toast.success(`Generated ${data.flashcards.length} flashcards`)
    } catch (error) {
      console.error("Error generating flashcards:", error)
      toast.error("Failed to generate flashcards. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  const saveDeck = async () => {
    if (!user || !flashcards.length || !deckName.trim()) return

    setSaving(true)
    try {
      // Create flashcard deck
      const newDeck = await createFlashcardDeck({
        user_id: user.id,
        document_id: id,
        name: deckName,
        description: `Generated from ${document?.name}`,
        flashcard_count: flashcards.length,
        created_at: new Date().toISOString(),
      })

      // Save individual flashcards
      const flashcardsData = flashcards.map((card) => ({
        user_id: user.id,
        document_id: id,
        deck_id: newDeck.id,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty,
        review_count: 0,
        correct_count: 0,
        created_at: new Date().toISOString(),
      }))

      await createFlashcards(flashcardsData)

      toast.success("Flashcard deck saved successfully")
      router.push("/flashcards")
    } catch (error) {
      console.error("Error saving flashcards:", error)
      toast.error("Failed to save flashcards")
    } finally {
      setSaving(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-emerald-600 bg-emerald-50"
      case "medium":
        return "text-amber-600 bg-amber-50"
      case "hard":
        return "text-rose-600 bg-rose-50"
      default:
        return "text-muted-foreground bg-muted"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center gap-4">
        <Link href={`/documents/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Flashcards</h1>
          <p className="text-muted-foreground">{document?.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generation Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generation Settings
            </CardTitle>
            <CardDescription>Configure how flashcards are generated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="deckName">Deck Name</Label>
              <Input
                id="deckName"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Enter deck name"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Number of Cards</Label>
                <span className="text-sm font-medium">{cardCount}</span>
              </div>
              <Slider
                value={[cardCount]}
                onValueChange={([value]) => setCardCount(value)}
                min={5}
                max={25}
                step={5}
              />
            </div>
            <Button
              onClick={generateFlashcards}
              disabled={generating || !content}
              className="w-full gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Generate Flashcards
                </>
              )}
            </Button>
            {!content && (
              <p className="text-sm text-muted-foreground text-center">
                Document needs to be processed first
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
            <CardDescription>
              {flashcards.length > 0
                ? `Card ${previewIndex + 1} of ${flashcards.length}`
                : "Generate flashcards to preview"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flashcards.length > 0 ? (
              <div className="space-y-4">
                <div
                  className="min-h-48 rounded-lg border border-border p-6 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${getDifficultyColor(
                        flashcards[previewIndex].difficulty
                      )}`}
                    >
                      {flashcards[previewIndex].difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Click to flip
                    </span>
                  </div>
                  <div className="text-center">
                    {showAnswer ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Answer</p>
                        <p className="text-lg">{flashcards[previewIndex].back}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Question</p>
                        <p className="text-lg font-medium">{flashcards[previewIndex].front}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewIndex((i) => Math.max(0, i - 1))
                      setShowAnswer(false)
                    }}
                    disabled={previewIndex === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewIndex((i) => Math.min(flashcards.length - 1, i + 1))
                      setShowAnswer(false)
                    }}
                    disabled={previewIndex === flashcards.length - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <div className="min-h-48 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Brain className="mx-auto h-12 w-12 opacity-50" />
                  <p className="mt-4">No flashcards generated yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      {flashcards.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{flashcards.length} flashcards ready to save</p>
              <p className="text-sm text-muted-foreground">
                Save this deck to start studying
              </p>
            </div>
            <Button onClick={saveDeck} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Deck
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All Cards List */}
      {flashcards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All Generated Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flashcards.map((card, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border p-4 cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setPreviewIndex(index)
                    setShowAnswer(false)
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{card.front}</p>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {card.back}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${getDifficultyColor(
                        card.difficulty
                      )}`}
                    >
                      {card.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
