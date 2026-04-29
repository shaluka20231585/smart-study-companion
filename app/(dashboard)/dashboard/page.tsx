// Marks this as a Client Component — required for hooks like useState and useEffect
"use client"

// useEffect: Runs data-fetching side effects after the component mounts
// useState: Stores stats and document list in local component state
import { useEffect, useState } from "react"

// useAuth: Gives access to the currently logged-in user
import { useAuth } from "@/contexts/auth-context"

// Database query helpers from lib/queries.ts
import { getDocuments, getFlashcardDecks, getQuizzes, getRecentDocuments } from "@/lib/queries"

// shadcn/ui components for the card layout
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"   // Horizontal progress bar
import { Skeleton } from "@/components/ui/skeleton"   // Placeholder while data is loading
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav" // Navigation breadcrumbs

// Icon imports used across the stat cards and quick actions
import {
  FileText,        // Documents icon
  Brain,           // Flashcards icon
  HelpCircle,      // Quizzes icon
  Clock,           // Study time icon
  TrendingUp,      // Quick Actions card heading icon
  Upload,          // Upload button icon
  ArrowRight,      // Right-arrow on quick action buttons
  Sparkles,        // Decoration icon
  BookOpen,        // Learning icon
} from "lucide-react"

// Link: Client-side navigation without full page reload
import Link from "next/link"

// Document type from our shared type definitions
import type { Document } from "@/lib/types"

// Describes the shape of the aggregated stats shown in the top cards
interface DashboardStats {
  documentsCount: number   // Total documents uploaded by this user
  flashcardsCount: number  // Total flashcard decks created
  quizzesCount: number     // Total quizzes generated
  totalStudyTime: number   // Total study time in seconds (placeholder for future tracking)
}

export default function DashboardPage() {
  // Get the currently logged-in user from auth context
  const { user } = useAuth()

  // stats: the four numbers shown in the top stat cards
  const [stats, setStats] = useState<DashboardStats>({
    documentsCount: 0,
    flashcardsCount: 0,
    quizzesCount: 0,
    totalStudyTime: 0,
  })

  // recentDocuments: last 3 uploaded documents shown in the "Recent Documents" card
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([])

  // loading: true while data is being fetched — shows Skeleton placeholders
  const [loading, setLoading] = useState(true)

  // Fetch all dashboard data when the component mounts or when `user` changes
  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return // Don't fetch if no user is logged in

      try {
        // Fetch all four queries at the same time to minimize wait time
        // Promise.all runs them concurrently and resolves when all finish
        const [docs, decks, quizzes, recentDocs] = await Promise.all([
          getDocuments(user.id),           // All documents for this user
          getFlashcardDecks(user.id),       // All flashcard decks
          getQuizzes(user.id),             // All generated quizzes
          getRecentDocuments(user.id, 3),  // Only the 3 most recent documents
        ])

        // Update the stats object with the fetched counts
        setStats({
          documentsCount:  docs?.length   || 0,   // Fallback to 0 if null/undefined
          flashcardsCount: decks?.length  || 0,
          quizzesCount:    quizzes?.length || 0,
          totalStudyTime:  0,  // Placeholder — time tracking not yet implemented
        })

        // Store the recent documents for the card below the stats
        setRecentDocuments(recentDocs)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false) // Stop showing skeletons regardless of success/failure
      }
    }

    fetchDashboardData()
  }, [user]) // Re-run if the logged-in user changes

  // Configuration array for the four stat cards at the top of the page
  // Keeping this as data (not JSX) makes it easy to add or remove cards
  const statCards = [
    {
      title: "Documents",
      value: stats.documentsCount,
      icon: FileText,
      href: "/documents",     // Clicking the card navigates here
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Flashcard Decks",
      value: stats.flashcardsCount,
      icon: Brain,
      href: "/flashcards",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Quizzes",
      value: stats.quizzesCount,
      icon: HelpCircle,
      href: "/quizzes",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Study Time",
      // Convert seconds → hours and round down — shows "0h" until tracking is active
      value: `${Math.round(stats.totalStudyTime / 60)}h`,
      icon: Clock,
      href: "/progress",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
  ]

  return (
    // pb-20 adds bottom padding on mobile so content isn't hidden behind the nav bar
    <div className="pb-20 lg:pb-0">
      {/* Breadcrumb navigation */}
      <BreadcrumbNav items={[{ label: "Dashboard" }]} />

      {/* ── HERO SECTION WITH GREETING ── */}
      <div className="mb-8 border-3 border-border bg-gradient-to-br from-primary via-pink-300 to-purple-300 p-6 sm:p-8 shadow-neo-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-white uppercase">Welcome back!</h1>
            <p className="text-white text-base sm:text-lg max-w-2xl font-bold">
              Keep up your learning momentum. Choose where to focus your study session today.
            </p>
          </div>
          <Sparkles className="h-8 w-8 text-white hidden sm:block flex-shrink-0" />
        </div>
      </div>

      {/* ── STAT CARDS GRID (NEOBRUTALIST) ── */}
      {/* Responsive: 1 column on mobile, 2 on sm, 4 on lg */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const bgGradients = [
            'from-pink-400 to-red-400',
            'from-green-400 to-emerald-500',
            'from-yellow-400 to-orange-400',
            'from-blue-400 to-cyan-500'
          ]
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className={`h-full cursor-pointer transition-all duration-300 border-3 border-border bg-gradient-to-br ${bgGradients[statCards.indexOf(stat)]} shadow-neo-lg hover:shadow-neo-2xl`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">{stat.title}</p>
                      <p className="text-4xl font-black mt-2 text-white">{stat.value}</p>
                    </div>
                    <div className="p-3 border-2 border-white bg-white bg-opacity-20 rounded-none">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Two-column grid for Quick Actions and Recent Documents */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Quick Actions — spans full width on mobile, 1 column on desktop */}
        <div className="lg:col-span-1">
          <Card className="h-full border-3 border-border bg-card shadow-neo-xl">
            <CardHeader className="border-b-3 border-border pb-4">
              <CardTitle className="flex items-center gap-2 font-black uppercase">
                <TrendingUp className="h-5 w-5" />
                Quick Start
              </CardTitle>
              <CardDescription className="font-bold">Jump into your study session</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pt-6">
              {/* Each button is wrapped in a Link for client-side navigation */}
              <Link href="/documents">
                <Button className="w-full justify-start gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-2 border-border font-bold shadow-neo-sm hover:shadow-neo uppercase text-xs" variant="default">
                  <Upload className="h-4 w-4" />
                  Upload Document
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
              <Link href="/chat">
                <Button className="w-full justify-start gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-2 border-border font-bold shadow-neo-sm hover:shadow-neo uppercase text-xs" variant="default">
                  <Sparkles className="h-4 w-4" />
                  Ask AI Tutor
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
              <Link href="/flashcards">
                <Button className="w-full justify-start gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-2 border-border font-bold shadow-neo-sm hover:shadow-neo uppercase text-xs" variant="default">
                  <Brain className="h-4 w-4" />
                  Study Flashcards
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
              <Link href="/quizzes">
                <Button className="w-full justify-start gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-2 border-border font-bold shadow-neo-sm hover:shadow-neo uppercase text-xs" variant="default">
                  <HelpCircle className="h-4 w-4" />
                  Take a Quiz
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents card — spans 2 columns on desktop */}
        <Card className="lg:col-span-2 border-3 border-border bg-card shadow-neo-xl">
          <CardHeader className="border-b-3 border-border pb-4">
            <CardTitle className="flex items-center gap-2 font-black uppercase">
              <BookOpen className="h-5 w-5" />
              Recent Documents
            </CardTitle>
            <CardDescription className="font-bold">Your recently uploaded study materials</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              // Show 3 skeleton rows while data is loading
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 border-2 border-border p-3">
                    <Skeleton className="h-10 w-10 bg-muted" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4 bg-muted" />
                      <Skeleton className="h-3 w-1/2 bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentDocuments.length === 0 ? (
              // Enhanced empty state with better guidance
              <div className="text-center py-12">
                <div className="border-3 border-border bg-primary w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-neo-sm">
                  <FileText className="h-8 w-8 text-white font-bold" />
                </div>
                <h3 className="font-black text-lg mb-1 uppercase">No documents yet</h3>
                <p className="font-bold mb-4">Upload a PDF to get started with AI-powered study tools</p>
                <Link href="/documents">
                  <Button className="bg-primary border-2 border-border text-primary-foreground font-bold shadow-neo-sm hover:shadow-neo uppercase">
                    Upload Your First Document
                  </Button>
                </Link>
              </div>
            ) : (
              // Render the list of recent documents with improved styling
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  // Each document row is a clickable link to its detail page
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-3 border-2 border-border p-3 transition-all hover:border-primary hover:bg-muted shadow-neo-sm hover:shadow-neo"
                  >
                    {/* Document icon badge */}
                    <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-blue-500 flex-shrink-0 font-bold">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    {/* Document name and upload date */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{doc.name}</p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {doc.uploadedAt?.toLocaleDateString()}
                      </p>
                    </div>
                    {/* Processing status badge — color-coded with neobrutalist styling */}
                    <div className="text-xs font-bold flex-shrink-0">
                      {doc.status === "ready" ? (
                        <span className="px-3 py-1 border-2 border-border bg-green-400 text-black shadow-neo-sm font-bold uppercase text-[10px]">Ready</span>
                      ) : doc.status === "processing" ? (
                        <span className="px-3 py-1 border-2 border-border bg-yellow-400 text-black shadow-neo-sm font-bold uppercase text-[10px] animate-pulse">Processing</span>
                      ) : (
                        <span className="px-3 py-1 border-2 border-border bg-red-400 text-white shadow-neo-sm font-bold uppercase text-[10px]">Error</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── WEEKLY STUDY PROGRESS (NEOBRUTALIST) ── */}
      <Card className="border-3 border-border bg-card shadow-neo-xl">
        <CardHeader className="border-b-3 border-border pb-4">
          <CardTitle className="flex items-center gap-2 font-black uppercase">
            <TrendingUp className="h-5 w-5" />
            Weekly Study Progress
          </CardTitle>
          <CardDescription className="font-bold">Track your learning consistency and goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">

            {/* Documents Reviewed progress bar — goal: 5 documents */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Documents Reviewed
                </span>
                <span className="text-sm font-semibold text-primary">{stats.documentsCount}/5</span>
              </div>
              {/* Math.min caps the value at 100% so the bar never overflows */}
              <Progress value={Math.min((stats.documentsCount / 5) * 100, 100)} className="h-3 rounded-full" />
            </div>

            {/* Flashcards Studied — estimated as 10 cards per deck, goal: 50 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4 text-emerald-600" />
                  Flashcards Studied
                </span>
                <span className="text-sm font-semibold text-primary">{stats.flashcardsCount * 10}/50</span>
              </div>
              <Progress value={Math.min((stats.flashcardsCount * 10 / 50) * 100, 100)} className="h-3 rounded-full" />
            </div>

            {/* Quizzes Completed — goal: 3 quizzes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-amber-600" />
                  Quizzes Completed
                </span>
                <span className="text-sm font-semibold text-primary">{stats.quizzesCount}/3</span>
              </div>
              <Progress value={Math.min((stats.quizzesCount / 3) * 100, 100)} className="h-3 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
