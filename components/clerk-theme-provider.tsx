"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

export function ClerkThemeProvider({ children }: { children: ReactNode }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use resolvedTheme to handle 'system' preference
  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <ClerkProvider
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: isDark
          ? {
              colorPrimary: "hsl(264.376, 24.3%, 48.8%)",
              colorBackground: "hsl(264.376, 1%, 11%)",
              colorInputBackground: "hsl(264.376, 1.5%, 20%)",
              colorInputText: "hsl(0, 0%, 98%)",
            }
          : {
              colorPrimary: "hsl(264.376, 24.3%, 48.8%)",
            },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
