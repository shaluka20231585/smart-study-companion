// Client Component — required for hooks, form state, and API calls
"use client"

// Spinner: imported but not used (Loader2 is used instead)
import { Spinner } from "@/components/ui/spinner"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"

// Query helpers: load document info and save the generated deck to the DB
import { getDocumentById, getDocumentContent, getDocumentTextFromChunks, createFlashcardDeck, createFlashcards } from "@/lib/queries"
// getDocumentTextFromChunks — primary content source (chunk-based)
// getDocumentContent — legacy fallback (document_contents table)
// createFlashcardDeck — inserts deck metadata row
// createFlashcards — inserts all card rows in one batch

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"    // Deck name text field
import { Label } from "@/components/ui/label"    // Accessible form labels
import { Slider } from "@/components/ui/slider"  // Card count slider (5–25)
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Brain, Sparkles, Save, Eye, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation" // Used to redirect after saving
import type { Document, Flashcard } from "@/lib/types"

// Shape of a flashcard returned by the AI generation endpoint
interface GeneratedFlashcard {
  front: string                              // Question or term
  back: string                               // Answer or definition
  difficulty: "easy" | "medium" | "hard"     // AI-assigned difficulty level
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function GenerateFlashcardsPage({ params }: PageProps) {
  const { id } = use(params) // Unwrap params Promise with React's `use()`
  const { user } = useAuth()
  const router = useRouter() // Used to navigate to /flashcards after saving

  // document: Metadata for the source document
  const [document, setDocument] = useState<Document | null>(null)

  // content: Extracted text sent to the AI generation API
  const [content, setContent] = useState<string>("")

  const [loading, setLoading] = useState(true)     // Page-level loading state
  const [generating, setGenerating] = useState(false) // AI call in progress
  const [saving, setSaving] = useState(false)         // DB save in progress

  // flashcards: AI-generated cards before the user saves them
  const [flashcards, setFlashcards] = useState<GeneratedFlashcard[]>([])

  // deckName: Pre-filled with "<document name> - Flashcards", user can edit
  const [deckName, setDeckName] = useState("")

  // cardCount: How many cards to ask the AI to generate (controlled by Slider)
  const [cardCount, setCardCount] = useState(10)

  // previewIndex: Which card is currently shown in the preview panel
  const [previewIndex, setPreviewIndex] = useState(0)

  // showAnswer: Flip state for the preview card — click to reveal back
  const [showAnswer, setShowAnswer] = useState(false)

  // Fetch document info and content once after mount
  useEffect(() => {
    async function fetchDocument() {
      if (!user || !id) return

      try {
        const docData = await getDocumentById(id, user.id)

        if (docData) {
          setDocument(docData as Document)
          setDeckName(`${docData.name} - Flashcards`) // Default deck name

          // Try the chunk-based content source first (higher quality, better coverage)
          try {
            const textFromChunks = await getDocumentTextFromChunks(id)
            if (textFromChunks) {
              setContent(textFromChunks)
            } else {
              // Fall back to the legacy document_contents table
              try {
                const contentData = await getDocumentContent(id)
                if (contentData) {
                  setContent(contentData.text || "")
                }
              } catch {
                // Silently ignore — content table may not have a row yet
              }
            }
          } catch {
            // Silently ignore — chunks table may not exist in older deployments
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

  /**
   * generateFlashcards — Calls the /api/flashcards/generate endpoint with the document content
   * Populates the flashcards state and resets the preview to card 0
   */
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
        body: JSON.stringify({ content, count: cardCount }), // Send text and desired count
      })

      if (!response.ok) throw new Error("Failed to generate flashcards")

      const data = await response.json()
      setFlashcards(data.flashcards)
      setPreviewIndex(0)   // Reset preview to first card
      setShowAnswer(false) // Start on question side
      toast.success(`Generated ${data.flashcards.length} flashcards`)
    } catch (error) {
      console.error("Error generating flashcards:", error)
      toast.error("Failed to generate flashcards. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  /**
   * saveDeck — Persists the generated flashcards as a new deck in Supabase
   * Creates the deck row, then bulk-inserts all card rows
   * Redirects to /flashcards on success
   *
   * Schema mapping from database:
   * flashcard_decks: {id, user_id, document_id, name, created_at}
   * flashcards: {id, deck_id, front, back, difficulty, created_at, review_count, correct_count, last_reviewed}
   */
  const saveDeck = async () => {
    if (!user || !flashcards.length || !deckName.trim()) return

    setSaving(true)
    try {
      // Create the parent deck row
      const deckData = {
        user_id:     user.id,
        document_id: id,
        name:        deckName,
        created_at:  new Date().toISOString(),
      }
      console.log("Creating flashcard deck with data:", deckData)
      
      const newDeck = await createFlashcardDeck(deckData)
      console.log("Deck created successfully:", newDeck)

      // Map flashcards using the correct column names from database schema
      // Only sending required fields: deck_id, front, back, difficulty, created_at
     const flashcardsData = flashcards.map((card) => ({
        deck_id:    newDeck.id,
        front:      card.front,
        back:       card.back,
        difficulty: card.difficulty,
        created_at: new Date().toISOString(),
      }))
      
      console.log(`Creating ${flashcardsData.length} flashcards for deck ${newDeck.id}`)
      console.log("First flashcard sample:", flashcardsData[0])
      await createFlashcards(flashcardsData)
      console.log("Flashcards created successfully")

      toast.success("Flashcard deck saved successfully")
      router.push("/flashcards")
    } catch (error) {
      // Improved error logging
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      console.error("Error saving flashcards - Full error:", error)
      console.error("Error message:", errorMessage)
      console.error("Error type:", typeof error)
      
      // Show more specific error to user
      if (errorMessage.includes("duplicate key")) {
        toast.error("A deck with this name already exists")
      } else if (errorMessage.includes("foreign key")) {
        toast.error("Invalid deck reference - please refresh and try again")
      } else if (errorMessage.includes("permission")) {
        toast.error("You don't have permission to save flashcards")
      } else if (errorMessage.includes("column")) {
        toast.error("Database schema mismatch - contact support")
      } else {
        toast.error(`Failed to save flashcards: ${errorMessage || "Unknown error"}`)
      }
    } finally {
      setSaving(false)
    }
  }

  /**
   * getDifficultyColor — Maps difficulty level to Tailwind colour classes for the badge
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":   return "text-emerald-600 bg-emerald-50"
      case "medium": return "text-amber-600 bg-amber-50"
      case "hard":   return "text-rose-600 bg-rose-50"
      default:       return "text-muted-foreground bg-muted"
    }
  }

  // — LOADING STATE — Skeleton placeholders while document fetches
  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />    {/* Header placeholder */}
        <Skeleton className="h-64 w-full" /> {/* Content placeholder */}
      </div>
    )
  }

  // — MAIN VIEW —
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* — PAGE HEADER — Back arrow + page title + document name as subtitle */}
      <div className="flex items-center gap-4">
        <Link href={`/documents/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Flashcards</h1>
          <p className="text-muted-foreground">{document?.name}</p>  {/* Subtitle: source document name */}
        </div>
      </div>

      {/* — 2-COLUMN GRID — Settings (left) + Preview (right) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* — GENERATION SETTINGS CARD — Name, card count slider, generate button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generation Settings
            </CardTitle>
            <CardDescription>Configure how flashcards are generated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Deck name input — pre-filled with document name in useEffect */}
            <div className="space-y-2">
              <Label htmlFor="deckName">Deck Name</Label>
              <Input
                id="deckName"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Enter deck name"
              />
            </div>
            {/* Card count: label + current value display + Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Number of Cards</Label>
                <span className="text-sm font-medium">{cardCount}</span>  {/* Live value display */}
              </div>
              {/* Slider: 5–25 in steps of 5 */}
              <Slider
                value={[cardCount]}
                onValueChange={([value]) => setCardCount(value)}
                min={5}
                max={25}
                step={5}
              />
            </div>
            {/* Generate button: disabled while generating or when no content is available */}
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
            {/* Warning shown if the document hasn't been processed yet */}
            {!content && (
              <p className="text-sm text-muted-foreground text-center">
                Document needs to be processed first
              </p>
            )}
          </CardContent>
        </Card>

        {/* — PREVIEW CARD — Flip card preview of the currently-selected generated card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview
            </CardTitle>
            {/* Subtitle shows card position once cards exist */}
            <CardDescription>
              {flashcards.length > 0
                ? `Card ${previewIndex + 1} of ${flashcards.length}`
                : "Generate flashcards to preview"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flashcards.length > 0 ? (
              <div className="space-y-4">
                {/* Flip card: click toggles showAnswer between front and back */}
                <div
                  className="min-h-48 rounded-lg border border-border p-6 cursor-pointer transition-all hover:shadow-md"
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  <div className="flex items-center justify-between mb-4">
                    {/* Difficulty badge coloured by getDifficultyColor */}
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
                      // Back side: answer text
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Answer</p>
                        <p className="text-lg">{flashcards[previewIndex].back}</p>
                      </div>
                    ) : (
                      // Front side: question text
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Question</p>
                        <p className="text-lg font-medium">{flashcards[previewIndex].front}</p>
                      </div>
                    )}
                  </div>
                </div>
                {/* Previous / Next navigation — also resets flip state on navigation */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewIndex((i) => Math.max(0, i - 1))
                      setShowAnswer(false)   // Reset to question side on navigate
                    }}
                    disabled={previewIndex === 0}   // Disabled at first card
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewIndex((i) => Math.min(flashcards.length - 1, i + 1))
                      setShowAnswer(false)   // Reset to question side on navigate
                    }}
                    disabled={previewIndex === flashcards.length - 1}  // Disabled at last card
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              // Placeholder shown before any cards are generated
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

      {/* — SAVE BUTTON CARD — Only rendered once cards have been generated */}
      {flashcards.length > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              {/* Dynamic count tells the user how many cards will be saved */}
              <p className="font-medium">{flashcards.length} flashcards ready to save</p>
              <p className="text-sm text-muted-foreground">
                Save this deck to start studying
              </p>
            </div>
            {/* Save Deck button: calls saveDeck() which creates a DB deck row + bulk-inserts cards */}
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

      {/* — ALL GENERATED CARDS LIST — Clickable rows jump to that card in the preview */}
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
                    setPreviewIndex(index)    // Jump preview to this card
                    setShowAnswer(false)       // Always start on the question side
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Front (question) text — truncated with CSS if too long */}
                      <p className="font-medium truncate">{card.front}</p>
                      {/* Back (answer) text — shown in muted colour and also truncated */}
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {card.back}
                      </p>
                    </div>
                    {/* Difficulty badge coloured by getDifficultyColor */}
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
