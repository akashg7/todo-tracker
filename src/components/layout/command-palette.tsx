"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useTaskStore } from "@/stores/task-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Search,
  LayoutDashboard,
  Inbox,
  Sun,
  Target,
  CalendarDays,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  icon: typeof Search;
  action: () => void;
  category: string;
  shortcut?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, toggleCommandPalette } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: CommandItem[] = [
    { id: "dashboard", label: "Go to Dashboard", icon: LayoutDashboard, action: () => router.push("/dashboard"), category: "Navigation" },
    { id: "inbox", label: "Go to Inbox", icon: Inbox, action: () => router.push("/inbox"), category: "Navigation" },
    { id: "today", label: "Go to Today", icon: Sun, action: () => router.push("/today"), category: "Navigation" },
    { id: "habits", label: "Go to Habits", icon: Target, action: () => router.push("/habits"), category: "Navigation" },
    { id: "calendar", label: "Go to Calendar", icon: CalendarDays, action: () => router.push("/calendar"), category: "Navigation" },
    { id: "analytics", label: "Go to Analytics", icon: BarChart3, action: () => router.push("/analytics"), category: "Navigation" },
    { id: "settings", label: "Go to Settings", icon: Settings, action: () => router.push("/settings"), category: "Navigation" },
    { id: "new-task", label: "Create New Task", icon: Plus, action: () => { useTaskStore.getState().toggleQuickAdd(true); }, category: "Actions", shortcut: "Q" },
  ];

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  const executeItem = useCallback(
    (item: CommandItem) => {
      item.action();
      toggleCommandPalette();
      setQuery("");
      setSelectedIndex(0);
    },
    [toggleCommandPalette]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        toggleCommandPalette();
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, toggleCommandPalette]);

  useEffect(() => {
    if (!commandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) executeItem(filtered[selectedIndex]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, filtered, selectedIndex, executeItem]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => {
              toggleCommandPalette();
              setQuery("");
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg"
          >
            <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Type a command or search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full py-4 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-background shrink-0">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto py-2">
                {filtered.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No results found
                  </div>
                )}
                {(() => {
                  let currentCategory = "";
                  return filtered.map((item, index) => {
                    const showCategory = item.category !== currentCategory;
                    currentCategory = item.category;
                    return (
                      <div key={item.id}>
                        {showCategory && (
                          <div className="px-4 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {item.category}
                          </div>
                        )}
                        <button
                          onClick={() => executeItem(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                            index === selectedIndex
                              ? "bg-accent/10 text-accent"
                              : "text-foreground hover:bg-surface-hover"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.shortcut && (
                            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                              {item.shortcut}
                            </kbd>
                          )}
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded border border-border bg-background font-mono">esc</kbd>
                  close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
