// Marks this as a Client Component — required for useState, useRouter, and form events
"use client"

// Spinner is imported but not used in this file (can be cleaned up later)
import { Spinner } from "@/components/ui/spinner"

import React from "react"

// useState: React hook to manage local state (form fields, error messages, loading flag)
import { useState } from "react"

// useRouter: Next.js hook to programmatically navigate to a different page
import { useRouter } from "next/navigation"

// Link: Next.js client-side navigation — faster than a plain <a> tag (no full page reload)
import Link from "next/link"

// useAuth: Custom hook from our AuthContext that provides the signIn function
import { useAuth } from "@/contexts/auth-context"

// shadcn/ui component imports — pre-styled, accessible UI building blocks
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Icon imports from lucide-react
import { BookOpen, AlertCircle, Loader2 } from "lucide-react"
// BookOpen: Used for the app logo in the card header
// AlertCircle: Icon shown inside the error alert
// Loader2: Spinning animation icon shown while the login request is in flight

export default function LoginPage() {
  // Controlled input state — each field's value is stored in React state
  const [email, setEmail] = useState("")      // Tracks what the user types in the email field
  const [password, setPassword] = useState("") // Tracks what the user types in the password field

  // Error message to display in the Alert banner (empty string = no error shown)
  const [error, setError] = useState("")

  // True while the sign-in network request is in flight — disables the form and shows a spinner
  const [isLoading, setIsLoading] = useState(false)

  // Pull the signIn function from our global auth context
  const { signIn } = useAuth()

  // Router instance used to redirect to /dashboard after successful login
  const router = useRouter()

  // Called when the user submits the form (clicks "Sign In" or presses Enter)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()        // Prevent the browser's default form submission (page reload)
    setError("")              // Clear any previous error message
    setIsLoading(true)        // Show spinner and disable the form

    try {
      // Call Supabase signInWithPassword through our auth context
      await signIn(email, password)

      // If sign-in succeeded, redirect the user to the main dashboard
      router.push("/dashboard")
    } catch (err) {
      // Show a user-friendly error — don't expose the raw Supabase error message
      setError("Invalid email or password. Please try again.")
    } finally {
      // Always re-enable the form after the request completes (success or failure)
      setIsLoading(false)
    }
  }

  return (
    // Full-screen centered layout with a subtle background
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Centered card container with neobrutalist styling */}
      <Card className="w-full max-w-md border-3 border-border bg-card shadow-neo-2xl">

        {/* Card header: app logo + title + subtitle */}
        <CardHeader className="text-center border-b-3 border-border pb-6">
          {/* Bold app logo badge with neobrutalist style */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-border bg-primary font-bold">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-black uppercase">Welcome back</CardTitle>
          <CardDescription className="text-sm font-semibold">Sign in to your Smart Study Companion account</CardDescription>
        </CardHeader>

        {/* Form wraps the card body and footer so Enter key submits correctly */}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">

            {/* Only render the error alert if there is an error message */}
            {error && (
              <Alert variant="destructive" className="border-2 border-destructive bg-destructive/10">
                <AlertCircle className="h-4 w-4" /> {/* Red warning icon */}
                <AlertDescription className="font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            {/* Email input field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-sm uppercase">Email</Label>
              <Input
                id="email"
                type="email"                          // Browser validates email format
                placeholder="you@example.com"
                value={email}                         // Controlled: value tied to state
                onChange={(e) => setEmail(e.target.value)} // Update state on every keystroke
                required                              // HTML5 validation — can't submit empty
                disabled={isLoading}                  // Grey out while loading
                className="border-2 border-border font-medium"
              />
            </div>

            {/* Password input field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-sm uppercase">Password</Label>
              <Input
                id="password"
                type="password"                             // Masks input characters
                placeholder="Enter your password"
                value={password}                            // Controlled input
                onChange={(e) => setPassword(e.target.value)} // Update state on keystroke
                required
                disabled={isLoading}
                className="border-2 border-border font-medium"
              />
            </div>
          </CardContent>

          {/* Card footer: submit button + link to signup page */}
          <CardFooter className="flex flex-col gap-4 border-t-3 border-border pt-6">
            {/* Submit button — disabled during loading to prevent double submission */}
            <Button 
              type="submit" 
              className="w-full border-2 border-border font-bold uppercase shadow-neo-sm hover:shadow-neo text-base py-2"
              disabled={isLoading}
            >
              {/* Show spinner icon while loading, nothing otherwise */}
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>

            {/* Link to the signup page for users without an account */}
            <p className="text-sm font-semibold text-center">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary underline font-bold">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
