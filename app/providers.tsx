"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";
import { ThemeProvider } from "next-themes";
import { ClerkThemeProvider } from "@/components/clerk-theme-provider";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);

      // Check if it's a network error
      if (
        event.reason?.message?.includes("network") ||
        event.reason?.message?.includes("fetch") ||
        event.reason?.message?.includes("Failed to fetch")
      ) {
        toast.error("Network Error", {
          description:
            "Unable to connect to the server. Please check your internet connection.",
        });
      }
      // Check if it's an authentication error
      else if (
        event.reason?.message?.includes("Unauthorized") ||
        event.reason?.message?.includes("unauthorized")
      ) {
        toast.error("Authentication Error", {
          description: "Your session may have expired. Please sign in again.",
        });
      }
      // Generic error
      else if (event.reason?.message) {
        toast.error("Error", {
          description: "An error occurred. Please try again.",
        });
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ClerkThemeProvider>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkThemeProvider>
    </ThemeProvider>
  );
}
