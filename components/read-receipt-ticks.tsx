"use client";

import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadReceiptTicksProps {
  status: "sent" | "delivered" | "read";
  className?: string;
}

export function ReadReceiptTicks({ status, className }: ReadReceiptTicksProps) {
  if (status === "sent") {
    return (
      <Check
        className={cn("h-3.5 w-3.5 text-muted-foreground", className)}
        strokeWidth={2.5}
        aria-label="Message sent"
      />
    );
  }

  if (status === "delivered") {
    return (
      <CheckCheck
        className={cn("h-3.5 w-3.5 text-muted-foreground", className)}
        strokeWidth={2.5}
        aria-label="Message delivered"
      />
    );
  }

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
