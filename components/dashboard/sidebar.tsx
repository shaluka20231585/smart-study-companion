// Marks this as a Client Component — needed because usePathname() uses browser APIs
"use client"

// Link: Next.js client-side navigation component (no full page reload)
import Link from "next/link"

// usePathname: Hook that returns the current URL path (e.g. "/documents")
// Used to highlight the active navigation item
import { usePathname } from "next/navigation"

// cn: Utility to merge Tailwind classes conditionally (from lib/utils.ts)
import { cn } from "@/lib/utils"

// Import all icon components from lucide-react (SVG icon library)
import {
  BookOpen,       // App logo icon in the sidebar header
  LayoutDashboard, // Dashboard page icon
  FileText,       // Documents page icon
  Brain,          // Flashcards page icon
  HelpCircle,     // Quizzes page icon
  MessageSquare,  // Chat / AI Tutor page icon
  BarChart3,      // Progress page icon
  Settings,       // Settings page icon
} from "lucide-react"

// Static array defining all sidebar navigation items
// Each item has a label, route path, and icon component
const navigation = [
  { name: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
  { name: "Documents",  href: "/documents",  icon: FileText        },
  { name: "Flashcards", href: "/flashcards", icon: Brain           },
  { name: "Quizzes",    href: "/quizzes",    icon: HelpCircle      },
  { name: "AI Tutor",   href: "/chat",       icon: MessageSquare   },
  { name: "Progress",   href: "/progress",   icon: BarChart3       },
  { name: "Settings",   href: "/settings",   icon: Settings        },
]

export function DashboardSidebar() {
  // Read the current URL path from the browser to know which nav item to highlight
  const pathname = usePathname()

  return (
    // Fragment — renders two separate elements (desktop sidebar + mobile nav) without a wrapper div
    <>
      {/* ── DESKTOP SIDEBAR ── hidden on mobile, visible from lg (1024px) and up ── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        {/* Scrollable inner column — allows overflow if there are many nav items */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r-3 border-border bg-sidebar px-6 pb-4">

          {/* App logo and name in the sidebar header */}
          <div className="flex h-16 shrink-0 items-center gap-2">
            {/* Colored square icon container with neobrutalist border */}
            <div className="flex h-9 w-9 items-center justify-center border-2 border-border bg-primary font-bold">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            {/* App name text */}
            <span className="text-lg font-bold">StudyCompanion</span>
          </div>

          {/* Navigation list */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-2">
              {/* Loop through the navigation array and render a link for each item */}
              {navigation.map((item) => {
                // Determine if this link represents the current page
                // pathname.startsWith handles nested routes like /documents/123
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        // Base classes always applied to every link
                        "group flex gap-x-3 px-3 py-2 text-sm font-bold leading-6 transition-all border-2",
                        // Conditionally apply active (highlighted) or inactive (muted) styles
                        isActive
                          ? "bg-primary text-primary-foreground border-border shadow-neo-sm"  // Active: solid primary background with shadow
                          : "text-foreground border-transparent hover:bg-muted hover:border-border" // Inactive: border less prominent
                      )}
                    >
                      {/* Render the icon component dynamically from the navigation array */}
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {/* Link label text */}
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ── fixed to bottom of screen, visible only below lg ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
        <div className="flex justify-around py-2">
          {/* Only show the first 5 items (Settings is omitted on mobile to save space) */}
          {navigation.slice(0, 5).map((item) => {
            // Same active check as the desktop sidebar
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  // Vertical stack layout: icon on top, label below
                  "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors",
                  // Active: primary color; Inactive: muted gray
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
