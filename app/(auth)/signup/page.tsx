// Marks this as a Client Component — needed for hooks and event handlers
"use client"

// Spinner imported for potential use (not currently used in render)
import { Spinner } from "@/components/ui/spinner"

import React from "react"

// useState: Manages all form field values and UI state
import { useState } from "react"

// useRouter: Lets us redirect programmatically after signup succeeds
import { useRouter } from "next/navigation"

// Link: Client-side navigation to the login page
import Link from "next/link"

// useAuth: Custom hook that provides the signUp function from AuthContext
import { useAuth } from "@/contexts/auth-context"

// shadcn/ui components — accessible, pre-styled form building blocks
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Icons used in the UI
import { BookOpen, AlertCircle, Loader2 } from "lucide-react"
// BookOpen: App logo in card header
// AlertCircle: Error icon inside the Alert
// Loader2: Animated spinner shown while the request is in flight

export default function SignUpPage() {
  // Controlled state for each form field
  const [name, setName] = useState("")                     // Full name entered by the user
  const [email, setEmail] = useState("")                   // Email address
  const [password, setPassword] = useState("")             // Password to set
  const [confirmPassword, setConfirmPassword] = useState("") // Re-typed password for validation

  // Error message displayed in the Alert banner (empty = no error visible)
  const [error, setError] = useState("")

  // True while the signup request is pending — disables the form and shows spinner
  const [isLoading, setIsLoading] = useState(false)

  // Pull the signUp function out of the auth context
  const { signUp } = useAuth()

  // Router instance for redirecting to /dashboard after successful registration
  const router = useRouter()

  // Called when the user submits the signup form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()  // Stop browser from doing a full page reload on form submit
    setError("")        // Clear any previous error message before re-validating

    // Client-side validation: passwords must match before hitting the server
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return // Stop here — don't call signUp
    }

    // Client-side validation: Supabase requires a minimum password length of 6
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true) // Show spinner and lock the form while the request runs

    try {
      // Call signUp: creates the Auth account, then inserts a user profile row in the DB
      await signUp(email, password, name)

      // Redirect to the dashboard on success — the user is now logged in
      router.push("/dashboard")
    } catch (err: unknown) {
      console.error("Signup error:", err)

      // Map specific Supabase / server error messages to user-friendly text
      if (err instanceof Error) {
        if (err.message.includes("email-already-in-use") || err.message.includes("EMAIL_EXISTS")) {
          // Supabase throws this when the email is already registered
          setError("An account with this email already exists")
        } else if (err.message.includes("weak-password")) {
          // Supabase rejects passwords that don't meet its strength policy
          setError("Password is too weak. Please use a stronger password.")
        } else {
          // Fall back to the raw error message for any other case
          setError(err.message || "Failed to create account. Please try again.")
        }
      } else {
        // err was not an Error instance (unusual) — show a generic message
        setError("Failed to create account. Please try again.")
      }
    } finally {
      // Always re-enable the form after the request finishes
      setIsLoading(false)
    }
  }

  return (
    // Full-screen centered layout with muted background
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Constrained-width card with neobrutalist styling */}
      <Card className="w-full max-w-md border-3 border-border bg-card shadow-neo-2xl">

        {/* Card header: logo, title, subtitle */}
        <CardHeader className="text-center border-b-3 border-border pb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-2 border-border bg-primary font-bold">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-black uppercase">Create an account</CardTitle>
          <CardDescription className="text-sm font-semibold">Start your smart study journey today</CardDescription>
        </CardHeader>

        {/* Form wraps inputs and the submit button */}
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">

            {/* Conditionally render the error alert only when there is an error */}
            {error && (
              <Alert variant="destructive" className="border-2 border-destructive bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            {/* Full name field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="font-bold text-sm uppercase">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)} // Update name state on every keystroke
                required
                disabled={isLoading}
                className="border-2 border-border font-medium"
              />
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-sm uppercase">Email</Label>
              <Input
                id="email"
                type="email"                              // Browser enforces valid email format
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="border-2 border-border font-medium"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bold text-sm uppercase">Password</Label>
              <Input
                id="password"
                type="password"                           // Masks the characters as the user types
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="border-2 border-border font-medium"
              />
            </div>

            {/* Confirm password field — must match the field above */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-bold text-sm uppercase">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="border-2 border-border font-medium"
              />
            </div>
          </CardContent>

          {/* Submit button and link to login */}
          <CardFooter className="flex flex-col gap-4 border-t-3 border-border pt-6">
            <Button 
              type="submit" 
              className="w-full border-2 border-border font-bold uppercase shadow-neo-sm hover:shadow-neo text-base py-2"
              disabled={isLoading}
            >
              {/* Spinning loader replaces the icon while request is pending */}
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Account
            </Button>

            {/* Link back to login for users who already have an account */}
            <p className="text-sm font-semibold text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary underline font-bold">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
