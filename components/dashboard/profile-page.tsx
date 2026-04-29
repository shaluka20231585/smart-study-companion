"use client"

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getDocuments, getFlashcardDecks, getQuizzes } from "@/lib/queries"
import { Button } from "@/components/ui/button"
import styles from "./profile.module.css"
import {
  FileText,
  Brain,
  HelpCircle,
  Settings,
  LogOut,
  Mail,
  Calendar,
  Edit2,
  TrendingUp,
  Award,
  Zap,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface UserStats {
  documents: number
  flashcards: number
  quizzes: number
  totalCards: number
  joinDate: string
}

export default function ProfilePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<UserStats>({
    documents: 0,
    flashcards: 0,
    quizzes: 0,
    totalCards: 0,
    joinDate: "",
  })
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function fetchUserData() {
      if (!user) return

      try {
        // Fetch stats
        const [docs, decks, quizzes] = await Promise.all([
          getDocuments(user.id),
          getFlashcardDecks(user.id),
          getQuizzes(user.id),
        ])

        // Fetch user profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        const totalCards = (decks || []).reduce((sum: number, deck: any) => sum + (deck.flashcard_count || 0), 0)

        setStats({
          documents: docs?.length || 0,
          flashcards: decks?.length || 0,
          quizzes: quizzes?.length || 0,
          totalCards,
          joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A",
        })

        setProfile(profileData)
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  if (!user) return null

  const userInitial = user.email?.charAt(0).toUpperCase() || "U"

  return (
    <div className="pb-20 lg:pb-0 px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.profileContent}>
          <div className={styles.profileAvatar}>{userInitial}</div>
          <div className={styles.profileInfo}>
            <h1>{user.email}</h1>
            <p className="flex items-center gap-2">
              <Mail size={16} /> {user.email}
            </p>
            <p className="flex items-center gap-2">
              <Calendar size={16} /> Member since {stats.joinDate}
            </p>
            <div className={styles.profileStats}>
              <div className={styles.statItem}>
                <div>{stats.documents}</div>
                <div>Documents</div>
              </div>
              <div className={styles.statItem}>
                <div>{stats.flashcards}</div>
                <div>Decks</div>
              </div>
              <div className={styles.statItem}>
                <div>{stats.quizzes}</div>
                <div>Quizzes</div>
              </div>
              <div className={styles.statItem}>
                <div>{stats.totalCards}</div>
                <div>Cards</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Statistics Section */}
      <h2 className={styles.sectionTitle}>📊 Learning Statistics</h2>
      <div className={styles.cardGrid}>
        {/* Documents Card */}
        <div className={`${styles.card} ${styles.card}`}>
          <div className={styles.cardHead}>
            <FileText size={18} className="inline mr-2" />
            Documents
          </div>
          <div className={styles.cardContent}>
            <div style={{ fontSize: "36px", fontWeight: "900", color: "#ff66a3", marginBottom: "8px" }}>
              {stats.documents}
            </div>
            <p>Total documents uploaded</p>
            <Link href="/documents">
              <div className={styles.cardButton}>View All →</div>
            </Link>
          </div>
        </div>

        {/* Flashcard Decks Card */}
        <div className={`${styles.card} ${styles.successCard}`}>
          <div className={styles.cardHead}>
            <Brain size={18} className="inline mr-2" />
            Flashcard Decks
          </div>
          <div className={styles.cardContent}>
            <div style={{ fontSize: "36px", fontWeight: "900", color: "#ffffff", marginBottom: "8px" }}>
              {stats.flashcards}
            </div>
            <p>{stats.totalCards} total cards</p>
            <Link href="/flashcards">
              <div className={styles.cardButton}>Browse →</div>
            </Link>
          </div>
        </div>

        {/* Quizzes Card */}
        <div className={`${styles.card} ${styles.warningCard}`}>
          <div className={styles.cardHead}>
            <HelpCircle size={18} className="inline mr-2" />
            Quizzes
          </div>
          <div className={styles.cardContent}>
            <div style={{ fontSize: "36px", fontWeight: "900", color: "#ffffff", marginBottom: "8px" }}>
              {stats.quizzes}
            </div>
            <p>Quizzes generated</p>
            <Link href="/quizzes">
              <div className={styles.cardButton}>Take Quiz →</div>
            </Link>
          </div>
        </div>

        {/* Progress Card */}
        <div className={`${styles.card} ${styles.purpleCard}`}>
          <div className={styles.cardHead}>
            <TrendingUp size={18} className="inline mr-2" />
            Your Progress
          </div>
          <div className={styles.cardContent}>
            <div style={{ fontSize: "36px", fontWeight: "900", color: "#ffffff", marginBottom: "8px" }}>
              85%
            </div>
            <p>Learning progress</p>
            <Link href="/progress">
              <div className={styles.cardButton}>Details →</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Study Preferences Section */}
      <h2 className={styles.sectionTitle}>⚙️ Study Preferences</h2>
      <div className={styles.cardGrid}>
        <div className={`${styles.card} ${styles.card}`}>
          <div className={styles.cardHead}>
            <Zap size={18} className="inline mr-2" />
            Study Mode
          </div>
          <div className={styles.cardContent}>
            <p style={{ marginBottom: "12px" }}>Learn • Practice • Speed Study</p>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>Customize your learning experience</p>
            <Link href="/settings">
              <div className={styles.cardButton}>Configure →</div>
            </Link>
          </div>
        </div>

        <div className={`${styles.card} ${styles.successCard}`}>
          <div className={styles.cardHead}>
            <Award size={18} className="inline mr-2" />
            Achievements
          </div>
          <div className={styles.cardContent}>
            <p style={{ marginBottom: "12px" }}>🏆 Streak Master</p>
            <p style={{ fontSize: "12px", color: "#fff", marginBottom: "12px" }}>Keep up your learning consistency</p>
            <button className={styles.cardButton}>View Badges →</button>
          </div>
        </div>

        <div className={`${styles.card} ${styles.purpleCard}`}>
          <div className={styles.cardHead}>
            <Settings size={18} className="inline mr-2" />
            Account
          </div>
          <div className={styles.cardContent}>
            <p style={{ marginBottom: "12px" }}>Manage your account</p>
            <p style={{ fontSize: "12px", color: "#fff", marginBottom: "12px" }}>Security, privacy & notifications</p>
            <Link href="/settings">
              <div className={styles.cardButton}>Settings →</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <h2 className={styles.sectionTitle}>🚀 Quick Actions</h2>
      <div className={styles.cardGrid}>
        <Link href="/documents" className="block">
          <div
            className={`${styles.card} w-full text-left`}
            style={{ cursor: "pointer", background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)" }}
          >
            <div className={styles.cardHead}>Upload Document</div>
            <div className={styles.cardContent}>
              <p>Extract knowledge from your study materials</p>
              <div className={styles.cardButton}>Start →</div>
            </div>
          </div>
        </Link>

        <Link href="/flashcards" className="block">
          <div
            className={`${styles.card} w-full text-left`}
            style={{ cursor: "pointer", background: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)" }}
          >
            <div className={styles.cardHead}>Create Flashcards</div>
            <div className={styles.cardContent}>
              <p>Generate smart flashcards from documents</p>
              <div className={styles.cardButton}>Create →</div>
            </div>
          </div>
        </Link>

        <Link href="/chat" className="block">
          <div
            className={`${styles.card} w-full text-left`}
            style={{ cursor: "pointer", background: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)" }}
          >
            <div className={styles.cardHead}>AI Tutor Chat</div>
            <div className={styles.cardContent}>
              <p>Get personalized learning assistance</p>
              <div className={styles.cardButton}>Chat Now →</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Account Settings Section */}
      <h2 className={styles.sectionTitle}>👤 Account Settings</h2>
      <div className={styles.cardGrid}>
        <Link href="/settings" className="block">
          <div className={`${styles.card} w-full text-left`} style={{ cursor: "pointer" }}>
            <div className={styles.cardHead}>Profile Settings</div>
            <div className={styles.cardContent}>
              <p>Update your profile information and preferences</p>
              <div className={styles.cardButton}>Edit Profile →</div>
            </div>
          </div>
        </Link>

        <div
          onClick={handleSignOut}
          className={`${styles.card} w-full text-left`}
          style={{ background: "linear-gradient(135deg, #ef4444 0%, #fca5a5 100%)", cursor: "pointer" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleSignOut()}
        >
          <div className={styles.cardHead}>
            <LogOut size={18} className="inline mr-2" />
            Sign Out
          </div>
          <div className={styles.cardContent}>
            <p>Safely sign out of your account</p>
            <div className={styles.cardButton}>
              Sign Out →
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
