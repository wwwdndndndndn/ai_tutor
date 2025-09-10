"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A simple input component that uses your design tokens for border, background
 * and focus ring colours. You can pass any native input props to it. Disabled
 * and read-only states are handled via native attributes.
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "ring-offset-background",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };