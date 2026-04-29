import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base: pill shape, bold text, shadow, smooth scale + shadow transition, focus ring
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold shadow-md transition-all duration-200 ease-in-out transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary — solid fill, glows blue-purple on hover
        default:
          'bg-primary text-primary-foreground border-2 border-primary hover:scale-105 hover:shadow-[0_0_20px_4px_rgba(99,102,241,0.5)] hover:bg-primary/90',

        // Destructive — solid red fill, red glow on hover
        destructive:
          'bg-destructive text-white border-2 border-destructive hover:scale-105 hover:shadow-[0_0_20px_4px_rgba(239,68,68,0.45)] hover:bg-destructive/90',

        // Outline — transparent with border, primary glow on hover
        outline:
          'bg-transparent text-foreground border-2 border-border hover:scale-105 hover:border-primary hover:text-primary hover:shadow-[0_0_18px_3px_rgba(99,102,241,0.3)] hover:bg-primary/5',

        // Secondary — subtle tinted fill, light primary glow on hover
        secondary:
          'bg-secondary text-secondary-foreground border-2 border-secondary hover:scale-105 hover:shadow-[0_0_14px_3px_rgba(99,102,241,0.2)] hover:bg-secondary/80',

        // Ghost — no chrome; scale + accent background on hover, no shadow
        ghost:
          'border-2 border-transparent bg-transparent shadow-none hover:scale-105 hover:bg-accent hover:text-accent-foreground',

        // Link — plain text link, no pill shape or shadow
        link: 'text-primary underline-offset-4 hover:underline shadow-none border-none rounded-none font-medium',
      },
      size: {
        default: 'h-10 px-6 py-2',
        sm:      'h-8 px-4 py-1 text-xs',
        lg:      'h-12 px-8 py-3 text-base',
        icon:    'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
