"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTaskStore } from "@/stores/task-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { cn } from "@/lib/utils";
import { Plus, Calendar, Flag, FolderOpen, X } from "lucide-react";

export function QuickAdd() {
  const { isQuickAddOpen, toggleQuickAdd, addTask } = useTaskStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<0 | 1 | 2 | 3>(0);
  const [dueDate, setDueDate] = useState("");
  const [folder, setFolder] = useState<"inbox" | "work" | "personal">("inbox");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" || 
        activeEl.tagName === "TEXTAREA" || 
        (activeEl as HTMLElement).isContentEditable
      );

      if (e.key === "q" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping) {
        e.preventDefault();
        toggleQuickAdd(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleQuickAdd]);

  useEffect(() => {
    if (isQuickAddOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isQuickAddOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: title.trim(), 
          priority,
          dueDate: dueDate || new Date().toISOString(),
          folder,
          workspaceId: activeWorkspaceId
        }),
      });
      if (res.status === 403) return (window.location.href = "/onboarding");
      if (res.status === 401) return (window.location.href = "/sign-in");
      if (res.ok) {
        const task = await res.json();
        addTask(task);
        window.dispatchEvent(new Event("app-data-changed"));
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setIsSubmitting(false);
    }

    setTitle("");
    setPriority(3);
    toggleQuickAdd(false);
  };

  const priorityColors = [
    "text-red-500",
    "text-orange-500",
    "text-blue-500",
    "text-gray-400",
  ];

  return (
    <AnimatePresence>
      {isQuickAddOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            onClick={() => toggleQuickAdd(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[91] w-full max-w-xl px-4"
          >
            <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <Plus className="w-5 h-5 text-accent shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What needs to be done?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                    if (e.key === "Escape") toggleQuickAdd(false);
                  }}
                  className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  onClick={() => toggleQuickAdd(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
                <div className="flex items-center gap-1">
                  {([0, 1, 2, 3] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
                        priority === p
                          ? `${priorityColors[p]} bg-surface-hover`
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      P{p}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <div className="relative flex items-center group/date">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <button className={cn("p-1.5 rounded-md transition-colors", dueDate ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover")}>
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>
                <button 
                  onClick={() => {
                    const folders = ["inbox", "work", "personal"] as const;
                    const next = folders[(folders.indexOf(folder) + 1) % folders.length];
                    setFolder(next);
                  }}
                  className={cn("p-1.5 rounded-md transition-colors px-2 text-xs flex items-center gap-1.5 font-medium", folder !== "inbox" ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover")}
                >
                  <FolderOpen className="w-4 h-4" />
                  {folder !== "inbox" && <span className="capitalize">{folder}</span>}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!title.trim() || isSubmitting}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 min-w-[80px]",
                    title.trim() && !isSubmitting
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-surface-hover text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-2 border-muted-foreground border-t-transparent rounded-full"
                    />
                  ) : (
                    "Add Task"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
