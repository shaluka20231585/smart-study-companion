// Client Component — required for useAuth hook and the router redirect
"use client"

// Spinner: imported but Loader2 is used instead (unused import)
import { Spinner } from "@/components/ui/spinner"

// React: needed to type the children prop
import React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation" // App Router's client-side navigation
import { useAuth } from "@/contexts/auth-context" // Access logged-in user + loading state
import { Loader2 } from "lucide-react"            // Animated spinner icon
import { DashboardSidebar } from "@/components/dashboard/sidebar" // Left nav panel
import { DashboardHeader } from "@/components/dashboard/header"   // Top header bar

// DashboardLayout — wraps every route inside (dashboard)/
// Enforces authentication: unauthenticated users are redirected to /login
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth() // user: null if logged out; loading: true until session resolved
  const router = useRouter()

  // Redirect to /login once the auth check is complete and no user is found
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login") // Hard redirect — replaces current history entry
    }
  }, [user, loading, router]) // Re-run if any of these change

  // Show a full-screen spinner while the Supabase session is being resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" /> {/* Spinning indicator */}
      </div>
    )
  }

  // Return nothing during the brief moment between auth resolving and redirect firing
  if (!user) {
    return null
  }

  // Authenticated layout: sidebar fixed on the left, header + main on the right
  return (
    <div className="min-h-screen bg-background">
      {/* Fixed left navigation (w-64 on lg screens) */}
      <DashboardSidebar />
      {/* Main content area — offset to the right of the sidebar on large screens */}
      <div className="lg:pl-64">
        <DashboardHeader /> {/* Sticky top bar with user menu and theme toggle */}
        <main className="p-6">{children}</main> {/* Routed page content */}
      </div>
    </div>
  )
}
