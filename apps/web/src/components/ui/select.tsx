// V-1: Select component - 2025-09-11
// Standard shadcn/ui select component with Bazari theme support
// path: apps/web/src/components/ui/select.tsx

import * as React from "react"
import { cn } from "../../lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    )
  }
)
Select.displayName = "Select"

// Para compatibilidade com shadcn/ui, criar componentes wrapper
const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

const SelectItem: React.FC<{ 
  value: string; 
  children: React.ReactNode;
  className?: string;
}> = ({ value, children, className }) => (
  <option value={value} className={className}>
    {children}
  </option>
);

const SelectTrigger = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  >
    {children}
  </select>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => (
  <option value="" disabled>
    {placeholder}
  </option>
);

export { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
}