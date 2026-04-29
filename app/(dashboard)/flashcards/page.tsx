// Marks this as a Client Component — required for hooks and event handlers
"use client"

// useEffect: Fetches decks after mount
// useState: Holds deck list and dialog state
// useCallback: Memoizes fetchDecks to keep the useEffect dependency stable
import { useEffect, useState, useCallback } from "react"

// useAuth: Provides the current user's ID for scoped DB queries
import { useAuth } from "@/contexts/auth-context"

// getFlashcardDecks: Fetches all flashcard decks for a user
// deleteFlashcardDeck: Deletes a deck and all its cards
import { getFlashcardDecks, deleteFlashcardDeck } from "@/lib/queries"

// shadcn/ui layout components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// Dropdown for the per-deck action menu (Study Now / Delete)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// AlertDialog for confirming before deleting a deck
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

// Icon imports
import { Brain, MoreVertical, Trash2, Play, FileText, Plus } from "lucide-react"
// Brain: Flashcards icon
// MoreVertical: Three-dot menu trigger
// Trash2: Delete icon
// Play: Study now icon
// FileText: "Go to Documents" button icon
// Plus: "Create from Document" button icon

// toast: Non-blocking notification (success/error)
import { toast } from "sonner"
import Link from "next/link"

// FlashcardDeck type from shared type definitions
import type { FlashcardDeck } from "@/lib/types"

export default function FlashcardsPage() {
  // Currently logged-in user
  const { user } = useAuth()

  // decks: All flashcard decks belonging to this user
  const [decks, setDecks] = useState<FlashcardDeck[]>([])

  // loading: True while the initial fetch is in progress
  const [loading, setLoading] = useState(true)

  // deleteDialogOpen: Controls visibility of the delete confirmation modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // deckToDelete: The deck the user wants to delete — held here until confirmed
  const [deckToDelete, setDeckToDelete] = useState<FlashcardDeck | null>(null)

  // Wrapped in useCallback so the function reference stays stable for useEffect
  const fetchDecks = useCallback(async () => {
    if (!user) return // Skip if not logged in

    try {
      const decksList = await getFlashcardDecks(user.id) // Query Supabase
      setDecks(decksList || [])                           // Default to empty array if null
    } catch (error) {
      console.error("Error fetching flashcard decks:", error)
      toast.error("Failed to load flashcard decks")
    } finally {
      setLoading(false) // Hide skeletons
    }
  }, [user])

  // Fetch decks once the component mounts
  useEffect(() => {
    fetchDecks()
  }, [fetchDecks])

  // Handles the confirmed deletion of a deck
  const handleDelete = async () => {
    if (!deckToDelete) return // Safety check

    try {
      await deleteFlashcardDeck(deckToDelete.id) // Delete deck + all its cards from DB
      // Remove the deck from local state instantly (optimistic update)
      setDecks((prev) => prev.filter((d) => d.id !== deckToDelete.id))
      toast.success("Flashcard deck deleted")
    } catch (error) {
      console.error("Error deleting deck:", error)
      toast.error("Failed to delete flashcard deck")
    } finally {
      setDeleteDialogOpen(false) // Close the dialog
      setDeckToDelete(null)      // Clear the pending deletion
    }
  }

  return (
    // pb-20 reserves space for the mobile bottom nav bar
    <div className="space-y-6 pb-20 lg:pb-0">

      {/* Page heading + create button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flashcards</h1>
          <p className="text-muted-foreground">Review and study your flashcard decks</p>
        </div>
        {/* Navigates to Documents page where users can generate new decks */}
        <Link href="/documents">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create from Document
          </Button>
        </Link>
      </div>

      {/* — LOADING STATE — skeleton cards while fetching */}
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
        // — EMPTY STATE — user has no decks yet
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
        // — DECK GRID — one card per flashcard deck
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <Card key={deck.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Emerald icon badge identifies flashcard decks */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <Brain className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* truncate prevents long deck names from breaking layout */}
                      <CardTitle className="text-base truncate">{deck.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {deck.createdAt?.toLocaleDateString()} {/* Format Date as locale string */}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Three-dot dropdown menu for this deck's actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Study link — navigates to the deck's study page */}
                      <DropdownMenuItem asChild>
                        <Link href={`/flashcards/${deck.id}`}>
                          <Play className="mr-2 h-4 w-4" />
                          Study Now
                        </Link>
                      </DropdownMenuItem>
                      {/* Delete — sets the deck and opens the confirmation dialog */}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          setDeckToDelete(deck)      // Remember which deck to delete
                          setDeleteDialogOpen(true)   // Open confirmation dialog
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              {/* Deck metadata and study button */}
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cards</span>
                    <span className="font-medium">{deck.flashcardCount}</span>
                  </div>
                  {/* Only show description if one exists */}
                  {deck.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {deck.description}
                    </p>
                  )}
                  {/* Primary CTA — duplicated from dropdown for quick access */}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flashcard Deck</AlertDialogTitle>
            <AlertDialogDescription>
              {/* Include the card count so the user knows how much they're deleting */}
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
