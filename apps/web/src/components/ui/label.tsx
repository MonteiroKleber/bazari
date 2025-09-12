// path: apps/web/src/components/ui/label.tsx

import { cn } from "../../lib/utils"

export function Label({ className, children, ...props }: any) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </label>
  )
}