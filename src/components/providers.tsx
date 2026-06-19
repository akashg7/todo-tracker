"use client";

import { useEffect, type ReactNode } from "react";
import { useAppStore } from "@/stores/app-store";

function ThemeSync() {
  const { theme, accentColor, density } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-accent", accentColor);
    root.setAttribute("data-density", density);
  }, [theme, accentColor, density]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}
