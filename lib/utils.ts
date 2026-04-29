// clsx: A utility that conditionally joins class names together
// e.g. clsx('btn', isActive && 'btn-active') → 'btn btn-active'
import { clsx, type ClassValue } from 'clsx'

// twMerge: Resolves Tailwind CSS class conflicts by keeping only the last one
// e.g. twMerge('p-4 p-6') → 'p-6' (removes the duplicate padding)
import { twMerge } from 'tailwind-merge'

/**
 * cn (className) - Utility to safely combine and deduplicate Tailwind CSS classes.
 * Used throughout the UI components instead of template literal strings.
 *
 * Example:
 *   cn('px-4 py-2', isActive && 'bg-blue-500', 'px-6')
 *   → 'py-2 bg-blue-500 px-6'  (px-4 is overridden by px-6)
 *
 * @param inputs - Any number of class strings, arrays, or conditional objects
 * @returns A single merged class string safe for use in className props
 */
export function cn(...inputs: ClassValue[]) {
  // First, clsx collapses conditionals and arrays into a plain class string
  // Then, twMerge resolves any Tailwind conflicts in that string
  return twMerge(clsx(inputs))
}
