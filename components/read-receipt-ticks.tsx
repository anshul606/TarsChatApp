"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ReadReceiptTicks Component
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 *
 * Displays WhatsApp-style read receipt tick marks:
 * - Single grey checkmark for "sent" status
 * - Double grey checkmarks for "delivered" status
 * - Double checkmarks for "read" status (grey in light mode, white in dark mode)
 */

interface ReadReceiptTicksProps {
  status: "sent" | "delivered" | "read";
  className?: string;
}

export function ReadReceiptTicks({ status, className }: ReadReceiptTicksProps) {
  if (status === "sent") {
    // Single grey checkmark
    return (
      <Check
        className={cn("h-3.5 w-3.5 text-muted-foreground", className)}
        strokeWidth={2.5}
        aria-label="Message sent"
      />
    );
  }

  if (status === "delivered") {
    // Double grey checkmarks
    return (
      <CheckCheck
        className={cn("h-3.5 w-3.5 text-muted-foreground", className)}
        strokeWidth={2.5}
        aria-label="Message delivered"
      />
    );
  }

  // status === "read"
  // Double checkmarks - grey in light mode, white in dark mode
  return (
    <CheckCheck
      className={cn(
        "h-3.5 w-3.5 text-muted-foreground dark:text-white/90",
        className,
      )}
      strokeWidth={2.5}
      aria-label="Message read"
    />
  );
}
