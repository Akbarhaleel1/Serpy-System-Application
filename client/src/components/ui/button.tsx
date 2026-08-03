import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform-gpu",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:scale-105 hover:shadow-glow active:scale-95 transition-all duration-300",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105 active:scale-95",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-elevated active:scale-95",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 active:scale-95",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-gradient-success text-success-foreground hover:scale-105 hover:shadow-glow active:scale-95",
        warning: "bg-gradient-warning text-warning-foreground hover:scale-105 hover:shadow-glow active:scale-95",
        pending: "bg-pending text-pending-foreground hover:bg-pending/90 hover:scale-105 active:scale-95",
        urgent: "bg-urgent text-urgent-foreground hover:bg-urgent/90 hover:scale-105 active:scale-95",
        gradient: "bg-gradient-primary text-primary-foreground hover:shadow-glow hover:scale-105 active:scale-95",
        accent: "bg-gradient-accent text-accent-foreground hover:scale-105 hover:shadow-glow active:scale-95",
        glass: "bg-gradient-glass backdrop-blur-sm border border-white/20 text-foreground hover:bg-white/20 hover:scale-105 active:scale-95",
        floating: "bg-gradient-primary text-primary-foreground shadow-float hover:shadow-glow hover:scale-110 hover:-translate-y-1 active:scale-95 active:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-14 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
