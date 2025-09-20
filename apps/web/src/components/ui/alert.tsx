// path: apps/web/src/components/ui/alert.tsx

import * as React from "react"
import { cn } from "../../lib/utils"

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

export function Alert({ className, variant = "default", children, ...props }: AlertProps) {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border p-4",
        variant === "destructive" 
          ? "border-destructive/50 text-destructive dark:border-destructive" 
          : "bg-background text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function AlertDescription({ className, children, ...props }: any) {
  return (
    <div
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    >
      {children}
    </div>
  )
}
