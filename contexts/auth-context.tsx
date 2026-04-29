// Marks this file as a Client Component so React hooks (useState, useEffect) can run in the browser
"use client"

// createContext: Creates a React context object that can be shared across the component tree
// useContext: Hook to consume a context value inside any child component
// useEffect: Hook to run side effects (e.g. fetching session) after component mounts
// useState: Hook to hold reactive state values (user, loading)
// ReactNode: TypeScript type for any valid React child (elements, strings, arrays, etc.)
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// Pre-configured Supabase browser client from our lib file
import { supabase } from "@/lib/supabase"

// User type from Supabase — describes the shape of a logged-in user object
import type { User } from "@supabase/supabase-js"

// Defines the shape of data and functions this context will expose to consumers
interface AuthContextType {
  user: User | null                                                        // Currently logged-in user, or null if logged out
  loading: boolean                                                         // True while we're checking for an existing session
  signIn: (email: string, password: string) => Promise<void>              // Function to log in an existing user
  signUp: (email: string, password: string, name: string) => Promise<void> // Function to register a new user
  signOut: () => Promise<void>                                             // Function to log the current user out
}

// Create the context with `undefined` as the initial value
// This lets us detect if a consumer is used outside of <AuthProvider>
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// AuthProvider wraps the entire app and makes auth state available to all children
export function AuthProvider({ children }: { children: ReactNode }) {
  // `user` holds the logged-in Supabase User object, or null if logged out
  const [user, setUser] = useState<User | null>(null)

  // `loading` is true while we are checking for an existing browser session
  // During this time we show a spinner instead of the page
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On first mount, ask Supabase if there is already an active session
    // (e.g. user refreshed the page — their JWT is stored in a cookie)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null) // Set the user from the active session, or null if none
      setLoading(false)              // We now know the auth state, stop showing spinner
    })

    // Subscribe to any future auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null) // Update user whenever auth state changes
      setLoading(false)              // Auth check is complete
    })

    // Cleanup: unsubscribe from the listener when the component unmounts
    // Prevents memory leaks if the provider is ever removed from the tree
    return () => subscription?.unsubscribe()
  }, []) // Empty array — only run once on mount

  // Sends email + password credentials to Supabase and logs the user in
  // Supabase automatically stores the resulting JWT in an httpOnly cookie
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error // Bubble the error up to the calling component to display to the user
  }

  // Registers a new user in two steps: (1) create an Auth account, (2) create a database profile row
  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Step 1: Create the authentication account in Supabase Auth
      // This generates a UUID for the user and sends a verification email if configured
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) throw signupError            // Auth creation failed — surface the error
      if (!authData.user) throw new Error("Failed to create user") // Unexpected: no user returned

      // Step 2: Insert a matching row in the `users` table with initial stats
      // The `id` must match the Auth UUID so we can JOIN the two records later
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,          // Matches the Supabase Auth UUID
        email,                         // Store email for display purposes
        name,                          // Display name entered during signup
        created_at: new Date().toISOString(), // ISO timestamp for when profile was created
        total_study_time: 0,           // Start all counters at zero
        documents_uploaded: 0,
        flashcards_created: 0,
        quizzes_taken: 0,
      })
      if (profileError) throw profileError // Profile insert failed — surface the error
    } catch (error) {
      console.error("SignUp error:", error)
      throw error // Re-throw so the UI form can display the error message
    }
  }

  // Clears the user's session from Supabase and removes the JWT cookie
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  // Provide the user, loading flag, and auth functions to all child components
  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — shortcut to consume the auth context without boilerplate
// Any component that calls useAuth() gets { user, loading, signIn, signUp, signOut }
export function useAuth() {
  const context = useContext(AuthContext)

  // Guard: if this hook is called outside of <AuthProvider>, throw a helpful error
  // This prevents silent bugs where auth state would be undefined
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
