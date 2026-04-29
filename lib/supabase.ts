// createClient: Supabase JS factory that creates a typed database/auth/storage client
import { createClient } from "@supabase/supabase-js"

// Read the Supabase project URL from environment variables
// NEXT_PUBLIC_ prefix makes this available in both server and browser code
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// Read the anonymous key — safe to expose publicly; Row Level Security policies protect data
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Guard: if either env variable is missing, throw at startup instead of failing silently later
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  )
}

// Export a single shared Supabase client instance used throughout the app
// This avoids creating multiple connections for the same project
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
