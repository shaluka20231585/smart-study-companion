// Marks this as a Client Component — required because useAuth uses React context hooks
"use client"

// useAuth: Provides the current user object and signOut function from Supabase auth
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

// ThemeToggle: The animated sun/moon dark/light mode switch
import { ThemeToggle } from "@/components/theme-toggle"

// shadcn/ui Dropdown components for the user avatar menu
import {
  DropdownMenu,            // Root that manages open/close state
  DropdownMenuContent,     // The popup panel that appears when the menu opens
  DropdownMenuItem,        // A single clickable item inside the menu
  DropdownMenuLabel,       // Non-interactive label text in the menu
  DropdownMenuSeparator,   // A horizontal divider line between menu sections
  DropdownMenuTrigger,     // The element that opens/closes the menu on click
} from "@/components/ui/dropdown-menu"

// Avatar + AvatarFallback: Circular avatar with initials as fallback (no image)
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// Icon imports for the dropdown menu items
import { LogOut, User, Settings } from "lucide-react"
// LogOut: Icon for the sign-out menu item
// User: Icon for the Profile menu item
// Settings: Icon for the Settings menu item

// Link: Next.js client-side navigation component
import Link from "next/link"

export function DashboardHeader() {
  // user: The currently signed-in Supabase user (contains email, id, etc.)
  // signOut: Calls supabase.auth.signOut() and clears the auth context state
  const { user, signOut } = useAuth()

  /**
   * getInitials — derives a 2-character display code from an email address
   * e.g. "john@example.com" → "JO"
   * Used as the fallback avatar content when no profile image is set
   */
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase() // Take the first two characters and uppercase them
  }

  return (
    // sticky top-0: header stays visible when the page scrolls
    // z-40: sits above most content but below modals (z-50)
    // Neobrutalist style with thick border and shadow
    <header className="sticky top-0 z-40 border-b-3 border-border bg-card shadow-neo-lg">
      <div className="flex h-16 items-center justify-between px-6">

        {/* ── MOBILE LOGO ── visible only on screens smaller than lg breakpoint */}
        {/* On large screens the sidebar shows the logo, so this is hidden (hidden lg:block below) */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-border bg-primary font-bold text-primary-foreground">
            SC
          </div>
          <span className="font-bold text-lg">StudyCompanion</span>
        </div>

        {/* Empty spacer on large screens — pushes the right-side controls to the far right */}
        <div className="hidden lg:block" />

        {/* ── RIGHT-SIDE CONTROLS: theme toggle + user avatar menu ── */}
        <div className="flex items-center gap-4">

          {/* Theme Toggle Button — switches between light and dark mode */}
          <ThemeToggle />

          {/* User Profile Dropdown — avatar button that opens a menu */}
          <DropdownMenu>
            {/* asChild passes the trigger props down to the Button instead of wrapping it */}
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-none border-2 border-border">
                <Avatar className="h-9 w-9">
                  {/* Show the user's initials when no profile photo exists */}
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {user?.email ? getInitials(user.email) : "U"} {/* Fallback to "U" if email is undefined */}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            {/* forceMount keeps the menu in the DOM for animation purposes */}
            <DropdownMenuContent className="w-56" align="end" forceMount>

              {/* User info label — not clickable, just shows who is logged in */}
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p> {/* Shows email address */}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator /> {/* Horizontal divider */}

              {/* Profile link — navigates to /settings (profile section) */}
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>

              {/* Settings link — also navigates to /settings */}
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator /> {/* Divider before destructive action */}

              {/* Sign out — calls signOut() from auth context, styled in red */}
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
