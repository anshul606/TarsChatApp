import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp for message display based on message age
 * Requirements: 4.1, 4.2, 4.3
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 */
export function formatMessageTimestamp(timestamp: number): string {
  const messageDate = new Date(timestamp);
  const now = new Date();

  // Check if message is from today
  const isToday =
    messageDate.getDate() === now.getDate() &&
    messageDate.getMonth() === now.getMonth() &&
    messageDate.getFullYear() === now.getFullYear();

  // Check if message is from this year
  const isThisYear = messageDate.getFullYear() === now.getFullYear();

  if (isToday) {
    // Format as time only (12-hour with AM/PM)
    // Example: "2:30 PM"
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else if (isThisYear) {
    // Format as "MMM D, h:mm A"
    // Example: "Jan 15, 2:30 PM"
    return messageDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    // Format as "MMM D, YYYY, h:mm A"
    // Example: "Dec 25, 2023, 2:30 PM"
    return messageDate.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
}
