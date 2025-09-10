"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A generic card component that provides a container with a border, background
 * colour and shadow. It uses your design tokens (`--card` and
 * `--card-foreground`) to determine its colours. Additional children can be
 * passed through as normal React children.
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export { Card };