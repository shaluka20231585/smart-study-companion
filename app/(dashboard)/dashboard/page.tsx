"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getDocuments, getFlashcardDecks, getQuizzes, getRecentDocuments } from "@/lib/queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FileText,
  Brain,
  HelpCircle,
  Clock,
  TrendingUp,
  Upload,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import type { Document } from "@/lib/types"

interface DashboardStats {
  documentsCount: number
  flashcardsCount: number
  quizzesCount: number
  totalStudyTime: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    documentsCount: 0,
    flashcardsCount: 0,
    quizzesCount: 0,
    totalStudyTime: 0,
  })
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return

      try {
        // Fetch all data in parallel
        const [docs, decks, quizzes, recentDocs] = await Promise.all([
          getDocuments(user.id),
          getFlashcardDecks(user.id),
          getQuizzes(user.id),
          getRecentDocuments(user.id, 3),
        ])

        setStats({
          documentsCount: docs?.length || 0,
          flashcardsCount: decks?.length || 0,
          quizzesCount: quizzes?.length || 0,
          totalStudyTime: 0, // Will be tracked separately
        })
        setRecentDocuments(recentDocs)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const statCards = [
    {
      title: "Documents",
      value: stats.documentsCount,
      icon: FileText,
      href: "/documents",
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
      value: `${Math.round(stats.totalStudyTime / 60)}h`,
      icon: Clock,
      href: "/progress",
      color: "text-rose-600",
      bgColor: "bg-rose-50",
    },
  ]

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s your study overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`rounded-md p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Get started with your study session</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/documents">
              <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                <Upload className="h-4 w-4" />
                Upload New Document
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/flashcards">
              <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                <Brain className="h-4 w-4" />
                Review Flashcards
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/quizzes">
              <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                <HelpCircle className="h-4 w-4" />
                Take a Quiz
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
            <Link href="/chat">
              <Button className="w-full justify-start gap-2 bg-transparent" variant="outline">
                <FileText className="h-4 w-4" />
                Ask AI Tutor
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Documents
            </CardTitle>
            <CardDescription>Your recently uploaded study materials</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No documents yet</p>
                <Link href="/documents">
                  <Button variant="link" className="mt-2">
                    Upload your first document
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.uploadedAt?.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {doc.status === "ready" ? (
                        <span className="text-emerald-600">Ready</span>
                      ) : doc.status === "processing" ? (
                        <span className="text-amber-600">Processing</span>
                      ) : (
                        <span className="text-red-600">Error</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Study Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Study Progress</CardTitle>
          <CardDescription>Track your learning consistency</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Documents Reviewed</span>
                <span className="font-medium">{stats.documentsCount}/5</span>
              </div>
              <Progress value={Math.min((stats.documentsCount / 5) * 100, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Flashcards Studied</span>
                <span className="font-medium">{stats.flashcardsCount * 10}/50</span>
              </div>
              <Progress value={Math.min((stats.flashcardsCount * 10 / 50) * 100, 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Quizzes Completed</span>
                <span className="font-medium">{stats.quizzesCount}/3</span>
              </div>
              <Progress value={Math.min((stats.quizzesCount / 3) * 100, 100)} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
