/**
 * BreadcrumbNav Component — Shows user location in the app hierarchy
 * Helps prevent users from getting lost and enables quick navigation back
 */

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string // undefined = current page (not clickable)
  icon?: React.ReactNode
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[]
  className?: string
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  return (
    <nav className={cn("flex items-center gap-0.5 text-sm mb-6", className)}>
      {/* Home icon — always first, links to dashboard */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
      >
        <Home className="h-4 w-4" />
      </Link>

      {/* Render each breadcrumb item */}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-0.5">
          {/* Separator icon */}
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 mx-0.5" />

          {/* Item content */}
          {item.href ? (
            // Clickable link
            <Link
              href={item.href}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted"
            >
              {item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
              {item.label}
            </Link>
          ) : (
            // Current page (not clickable)
            <div className="inline-flex items-center gap-1.5 px-2 py-1.5 text-foreground font-medium">
              {item.icon && <span className="h-4 w-4 flex-shrink-0">{item.icon}</span>}
              {item.label}
            </div>
          )}
        </div>
      ))}
    </nav>
  )
}
