// path: apps/web/src/components/ui/slider.tsx

import { cn } from "../../lib/utils"

interface SliderProps {
  className?: string;
  value?: number[];
  onValueChange?: (value: number[]) => void;
  max?: number;
  min?: number;
  step?: number;
}

export function Slider({ 
  className, 
  value = [0], 
  onValueChange, 
  max = 100, 
  min = 0, 
  step = 1,
  ...props 
}: SliderProps) {
  return (
    <div
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
        className="w-full"
      />
    </div>
  )
}