"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/**
 * Tooltip components using Radix UI primitives. The tooltip content uses
 * `bg-popover` and `text-popover-foreground` tokens for its colours by
 * default; adjust these classes if you prefer a different style.
 */
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipPortal = TooltipPrimitive.Portal;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, side = "top", align = "center", sideOffset = 4, ...props }, ref) => (
  <TooltipPortal>
    <TooltipPrimitive.Content
      ref={ref}
      side={side}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    />
  </TooltipPortal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
};