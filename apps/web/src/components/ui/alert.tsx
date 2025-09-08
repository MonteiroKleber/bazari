// path: apps/web/src/components/ui/alert.tsx

import { cn } from "../../lib/utils"

interface AlertProps {
  className?: string;
  variant?: "default" | "destructive";
  children?: React.ReactNode;
}

export function Alert({ className, variant = "default", children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
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