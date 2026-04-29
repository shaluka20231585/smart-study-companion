// Client Component — required for hooks and interactive study session
"use client"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"

// Query helpers for fetching and updating flashcard data
import { getFlashcardDeckById, getFlashcardsByDeck, updateFlashcard } from "@/lib/queries"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"   // Top progress bar showing study progress
import { Skeleton } from "@/components/ui/skeleton"

// Icon imports
import { ArrowLeft, Brain, RotateCcw, CheckCircle, XCircle, Shuffle } from "lucide-react"
// ArrowLeft: Back navigation
// Brain: Empty state icon
// RotateCcw: Study Again button
// CheckCircle: Correct answer button + session complete icon
// XCircle: Incorrect answer button
// Shuffle: Shuffle deck button

import { toast } from "sonner"
import Link from "next/link"
import type { FlashcardDeck, Flashcard } from "@/lib/types"

// PageProps — params is a Promise in Next.js 15+ (must be unwrapped with `use()`)
interface PageProps {
  params: Promise<{ id: string }>
}

export default function StudyFlashcardsPage({ params }: PageProps) {
  // Unwrap the params Promise using React's `use()` hook
  const { id } = use(params)
  const { user } = useAuth()

  // deck: Metadata about the flashcard collection (name, description, etc.)
  const [deck, setDeck] = useState<FlashcardDeck | null>(null)

  // flashcards: The shuffled cards for this study session
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])

  // currentIndex: Which card is currently displayed (0-based)
  const [currentIndex, setCurrentIndex] = useState(0)

  // showAnswer: Toggles between showing the question (front) and answer (back)
  const [showAnswer, setShowAnswer] = useState(false)

  const [loading, setLoading] = useState(true)

  // sessionStats: Counts correct/incorrect responses for the completion screen
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 })

  // isComplete: True when the user has responded to every card
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    async function fetchDeckAndCards() {
      if (!user || !id) return

      try {
        // Fetch deck metadata by ID (also validates it belongs to this user)
        const deckData = await getFlashcardDeckById(id, user.id)

        if (deckData) {
          setDeck(deckData as FlashcardDeck)

          // Fetch all flashcards for this deck
          const cards = await getFlashcardsByDeck(id)
          // Shuffle on load so the order changes every session
          // Math.random() - 0.5 produces random positive/negative comparisons
          const shuffled = [...(cards || [])].sort(() => Math.random() - 0.5)
          setFlashcards(shuffled as Flashcard[])
        } else {
          toast.error("Flashcard deck not found")
        }
      } catch (error) {
        console.error("Error fetching flashcards:", error)
        toast.error("Failed to load flashcards")
      } finally {
        setLoading(false)
      }
    }

    fetchDeckAndCards()
  }, [user, id])

  /**
   * handleResponse — Records user's self-assessment (correct/incorrect) for the current card
   * Updates the card's review stats in Supabase, then advances to the next card
   */
  const handleResponse = async (correct: boolean) => {
    const currentCard = flashcards[currentIndex]

    // Increment the correct or incorrect tally for the session summary
    setSessionStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }))

    // Persist the review to the DB (review_count and correct_count columns)
    try {
      await updateFlashcard(currentCard.id, {
        reviewCount: (currentCard.reviewCount || 0) + 1,                         // Always increment
        correctCount: (currentCard.correctCount || 0) + (correct ? 1 : 0),       // Increment only if correct
        lastReviewed: new Date().toISOString(),                                   // Update timestamp
      })
    } catch (error) {
      console.error("Error updating flashcard:", error) // Non-blocking — study session continues
    }

    // Advance to next card, or mark session complete if this was the last card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1) // Go to next card
      setShowAnswer(false)                 // Reset flip state for new card
    } else {
      setIsComplete(true) // All cards reviewed — show summary screen
    }
  }

  /**
   * restartSession — Re-shuffles the deck and resets all session state
   * Triggered by the "Study Again" button on the completion screen
   */
  const restartSession = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5) // Re-shuffle
    setFlashcards(shuffled)
    setCurrentIndex(0)                              // Back to first card
    setShowAnswer(false)                            // Show question side
    setSessionStats({ correct: 0, incorrect: 0 })  // Reset tally
    setIsComplete(false)                            // Hide completion screen
  }

  /**
   * getDifficultyColor — Maps a difficulty string to Tailwind colour classes
   * Used to colour the difficulty badge on each card
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":   return "text-emerald-600 bg-emerald-50"
      case "medium": return "text-amber-600 bg-amber-50"
      case "hard":   return "text-rose-600 bg-rose-50"
      default:       return "text-muted-foreground bg-muted"
    }
  }

  // — LOADING STATE — Show skeleton placeholder while data fetches
  if (loading) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Skeleton className="h-8 w-64" />                        {/* Header placeholder */}
        <Skeleton className="h-96 w-full max-w-2xl mx-auto" />   {/* Card placeholder */}
      </div>
    )
  }

  // — EMPTY STATE — Deck not found or has no cards
  if (!deck || flashcards.length === 0) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        {/* Back navigation link */}
        <Link href="/flashcards" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Flashcards
        </Link>
        {/* Centred empty-state card with Brain icon */}
        <Card className="py-16 max-w-2xl mx-auto">
          <CardContent className="text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No flashcards found</h3>
            <p className="mt-2 text-muted-foreground">
              This deck doesn&apos;t have any flashcards yet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // — COMPLETION SCREEN — All cards answered; show accuracy summary
  if (isComplete) {
    // Calculate percentage accuracy across the session
    const percentage = Math.round((sessionStats.correct / flashcards.length) * 100)
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/flashcards" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Flashcards
        </Link>
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            {/* Green check icon in a circular badge */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Session Complete!</CardTitle>
            <CardDescription>Great job studying {deck.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Large accuracy percentage in primary colour */}
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{percentage}%</p>
              <p className="text-muted-foreground mt-2">Accuracy</p>
            </div>
            {/* Correct vs incorrect side-by-side boxes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{sessionStats.correct}</p>
                <p className="text-sm text-emerald-600">Correct</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-4 text-center">
                <p className="text-2xl font-bold text-rose-600">{sessionStats.incorrect}</p>
                <p className="text-sm text-rose-600">Incorrect</p>
              </div>
            </div>
            {/* Action buttons: re-shuffle and study again, or go back */}
            <div className="flex gap-3">
              <Button onClick={restartSession} className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" />
                Study Again
              </Button>
              <Link href="/flashcards" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Back to Decks
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Current card shortcut and progress percentage for the bar
  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100   // e.g. card 3/10 = 30%

  // — MAIN STUDY VIEW —
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* — HEADER — Deck name, card counter, Shuffle button */}
      <div className="flex items-center gap-4">
        <Link href="/flashcards" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{deck.name}</h1>
          <p className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}  {/* 1-based display */}
          </p>
        </div>
        {/* Shuffle re-randomises order and resets session stats */}
        <Button variant="outline" size="sm" onClick={restartSession} className="gap-2 bg-transparent">
          <Shuffle className="h-4 w-4" />
          Shuffle
        </Button>
      </div>

      {/* Progress bar filled proportionally to how many cards have been answered */}
      <Progress value={progress} className="h-2" />

      {/* — FLIP CARD — Click anywhere on the card to toggle front/back */}
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div
            className="min-h-64 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setShowAnswer(!showAnswer)}  // Toggle front ↔ back
          >
            {/* Difficulty badge coloured by getDifficultyColor */}
            <span
              className={`text-xs font-medium px-2 py-1 rounded mb-4 ${getDifficultyColor(
                currentCard.difficulty
              )}`}
            >
              {currentCard.difficulty}
            </span>
            {showAnswer ? (
              // — BACK SIDE — Show the answer
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">Answer</p>
                <p className="text-xl leading-relaxed">{currentCard.back}</p>
              </div>
            ) : (
              // — FRONT SIDE — Show the question with a "tap to flip" hint
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">Question</p>
                <p className="text-xl font-medium leading-relaxed">{currentCard.front}</p>
                <p className="text-sm text-muted-foreground mt-6">Tap to reveal answer</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* — RESPONSE BUTTONS — Only visible after flipping to the answer side */}
      {showAnswer && (
        <div className="flex gap-4 max-w-2xl mx-auto">
          {/* Incorrect button: rose-bordered outline, calls handleResponse(false) */}
          <Button
            variant="outline"
            className="flex-1 h-14 gap-2 border-rose-200 hover:bg-rose-50 hover:text-rose-600 bg-transparent"
            onClick={() => handleResponse(false)}
          >
            <XCircle className="h-5 w-5" />
            Incorrect
          </Button>
          {/* Correct button: solid emerald, calls handleResponse(true) */}
          <Button
            className="flex-1 h-14 gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleResponse(true)}
          >
            <CheckCircle className="h-5 w-5" />
            Correct
          </Button>
        </div>
      )}

      {/* — SESSION STATS FOOTER — Running tally of correct and incorrect responses */}
      <div className="flex justify-center gap-4 text-sm text-muted-foreground max-w-2xl mx-auto">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {sessionStats.correct} correct      {/* Incremented on each "Correct" click */}
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-4 w-4 text-rose-600" />
          {sessionStats.incorrect} incorrect  {/* Incremented on each "Incorrect" click */}
        </span>
      </div>
    </div>
  )
}
