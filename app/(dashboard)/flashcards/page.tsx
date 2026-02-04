"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getFlashcardDecks, deleteFlashcardDeck } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Brain, MoreVertical, Trash2, Play, FileText, Plus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { FlashcardDeck } from "@/lib/types"

export default function FlashcardsPage() {
  const { user } = useAuth()
  const [decks, setDecks] = useState<FlashcardDeck[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null)

  const fetchDecks = useCallback(async () => {
    if (!user) return

    try {
      const decksList = await getFlashcardDecks(user.id)
      setDecks(decksList || [])
    } catch (error) {
      console.error("Error fetching flashcard decks:", error)
      toast.error("Failed to load flashcard decks")
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  const handleDelete = async () => {
    if (!deckToDelete) return

    try {
      await deleteFlashcardDeck(deckToDelete.id)
      setDecks((prev) => prev.filter((d) => d.id !== deckToDelete.id))
      toast.success("Flashcard deck deleted")
    } catch (error) {
      console.error("Error deleting deck:", error)
      toast.error("Failed to delete flashcard deck")
    } finally {
      setDeleteDialogOpen(false)
      setDeckToDelete(null)
    }
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-muted-foreground">Review and study your flashcard decks</p>
        </div>
        <Link href="/documents">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create from Document
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <Brain className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No flashcard decks yet</h3>
            <p className="mt-2 text-muted-foreground">
              Generate flashcards from your uploaded documents
            </p>
            <Link href="/documents">
              <Button className="mt-6 gap-2">
                <FileText className="h-4 w-4" />
                Go to Documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card key={deck.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <Brain className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{deck.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {deck.createdAt?.toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/flashcards/${deck.id}`}>
                          <Play className="mr-2 h-4 w-4" />
                          Study Now
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setDeckToDelete(deck)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cards</span>
                    <span className="font-medium">{deck.flashcardCount}</span>
                  </div>
                  {deck.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {deck.description}
                    </p>
                  )}
                  <Link href={`/flashcards/${deck.id}`}>
                    <Button className="w-full gap-2 mt-2">
                      <Play className="h-4 w-4" />
                      Study Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard Deck</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deckToDelete?.name}&quot;? This will delete all
              {deckToDelete?.flashcardCount} flashcards in this deck. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
