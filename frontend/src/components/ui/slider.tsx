import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "../../lib/utils"

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn("slider relative flex w-full touch-none select-none items-center", className)}{...props}>
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-object-color-secondary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="slider-thumb block h-4 w-4 rounded-full border border-primary/50 bg-object-color-primary shadow transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))


Slider.displayName = SliderPrimitive.Root.displayName
