"use client"

import { useEffect, useState, use } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getFlashcardDeckById, getFlashcardsByDeck, updateFlashcard } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Brain, RotateCcw, CheckCircle, XCircle, Shuffle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { FlashcardDeck, Flashcard } from "@/lib/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function StudyFlashcardsPage({ params }: PageProps) {
  const { id } = use(params)
  const { user } = useAuth()
  const [deck, setDeck] = useState<FlashcardDeck | null>(null)
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 })
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    async function fetchDeckAndCards() {
      if (!user || !id) return

      try {
        // Fetch deck
        const deckData = await getFlashcardDeckById(id, user.id)

        if (deckData) {
          setDeck(deckData as FlashcardDeck)

          // Fetch flashcards
          const cards = await getFlashcardsByDeck(id)
          // Shuffle cards
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

  const handleResponse = async (correct: boolean) => {
    const currentCard = flashcards[currentIndex]

    // Update stats
    setSessionStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }))

    // Update card in database
    try {
      await updateFlashcard(currentCard.id, {
        reviewCount: (currentCard.reviewCount || 0) + 1,
        correctCount: (currentCard.correctCount || 0) + (correct ? 1 : 0),
        lastReviewed: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error updating flashcard:", error)
    }

    // Move to next card
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1)
      setShowAnswer(false)
    } else {
      setIsComplete(true)
    }
  }

  const restartSession = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5)
    setFlashcards(shuffled)
    setCurrentIndex(0)
    setShowAnswer(false)
    setSessionStats({ correct: 0, incorrect: 0 })
    setIsComplete(false)
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
        <Skeleton className="h-96 w-full max-w-2xl mx-auto" />
      </div>
    )
  }

  if (!deck || flashcards.length === 0) {
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/flashcards" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Flashcards
        </Link>
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

  if (isComplete) {
    const percentage = Math.round((sessionStats.correct / flashcards.length) * 100)
    return (
      <div className="space-y-6 pb-20 lg:pb-0">
        <Link href="/flashcards" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Flashcards
        </Link>
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Session Complete!</CardTitle>
            <CardDescription>Great job studying {deck.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-primary">{percentage}%</p>
              <p className="text-muted-foreground mt-2">Accuracy</p>
            </div>
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

  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center gap-4">
        <Link href="/flashcards" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">{deck.name}</h1>
          <p className="text-sm text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={restartSession} className="gap-2 bg-transparent">
          <Shuffle className="h-4 w-4" />
          Shuffle
        </Button>
      </div>

      <Progress value={progress} className="h-2" />

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div
            className="min-h-64 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            <span
              className={`text-xs font-medium px-2 py-1 rounded mb-4 ${getDifficultyColor(
                currentCard.difficulty
              )}`}
            >
              {currentCard.difficulty}
            </span>
            {showAnswer ? (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">Answer</p>
                <p className="text-xl leading-relaxed">{currentCard.back}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">Question</p>
                <p className="text-xl font-medium leading-relaxed">{currentCard.front}</p>
                <p className="text-sm text-muted-foreground mt-6">Tap to reveal answer</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showAnswer && (
        <div className="flex gap-4 max-w-2xl mx-auto">
          <Button
            variant="outline"
            className="flex-1 h-14 gap-2 border-rose-200 hover:bg-rose-50 hover:text-rose-600 bg-transparent"
            onClick={() => handleResponse(false)}
          >
            <XCircle className="h-5 w-5" />
            Incorrect
          </Button>
          <Button
            className="flex-1 h-14 gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleResponse(true)}
          >
            <CheckCircle className="h-5 w-5" />
            Correct
          </Button>
        </div>
      )}

      <div className="flex justify-center gap-4 text-sm text-muted-foreground max-w-2xl mx-auto">
        <span className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {sessionStats.correct} correct
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-4 w-4 text-rose-600" />
          {sessionStats.incorrect} incorrect
        </span>
      </div>
    </div>
  )
}
