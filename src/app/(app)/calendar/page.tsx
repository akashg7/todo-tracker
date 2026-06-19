"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  X,
} from "lucide-react";

import { useWorkspaceStore } from "@/stores/workspace-store";

interface CalendarTask {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  priority: number;
  project?: { color: string } | null;
}

export default function CalendarPage() {
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { activeWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    fetchTasks();
    const handleDataChange = () => fetchTasks();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, [currentDate, activeWorkspaceId]);

  async function fetchTasks() {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
      const wsFilter = activeWorkspaceId ? `&workspaceId=${activeWorkspaceId}` : "";
      
      const res = await fetch(`/api/tasks?dueAfter=${start}&dueBefore=${end}${wsFilter}`, { cache: "no-store" });
      if (res.status === 403) return (window.location.href = "/onboarding");
      if (res.status === 401) return (window.location.href = "/sign-in");
      const json = await res.json();
      if (Array.isArray(json)) setTasks(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  function getTasksForDate(date: Date) {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
  }

  const today = new Date();
  const isToday = (date: Date) =>
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
    
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const priorityColors = ["#EF4444", "#F97316", "#3B82F6", "#6B7280"];

  if (loading) {
    return <div className="p-8 text-muted-foreground animate-pulse">Loading calendar...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md pt-4 pb-2 -mt-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-accent" />
            Calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-foreground min-w-[160px] text-center">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors ml-2"
          >
            Today
          </button>
        </div>
      </motion.div>

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-surface border border-border rounded-2xl overflow-hidden"
      >
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day) => (
            <div key={day} className="px-3 py-3 text-xs font-semibold text-muted-foreground text-center uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, i) => {
            const dayTasks = getTasksForDate(date);
            const isCurrentDay = isToday(date);

            return (
              <div
                key={i}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "min-h-[100px] p-2 border-b border-r border-border/50 transition-all hover:bg-surface-hover cursor-pointer relative",
                  !isCurrentMonth && "opacity-30",
                  selectedDate && isSameDay(selectedDate, date) && "ring-2 ring-accent ring-inset bg-accent/5"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium",
                      isCurrentDay
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground"
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                      style={{
                        backgroundColor: (task.project?.color || priorityColors[task.priority]) + "20",
                        color: task.project?.color || priorityColors[task.priority],
                      }}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-muted-foreground px-1.5">
                      +{dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Slide Out Panel */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
              onClick={() => setSelectedDate(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-surface border-l border-border z-[90] shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-lg">
                    {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 rounded-lg text-muted-foreground hover:bg-surface-hover transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {getTasksForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-sm">No tasks scheduled for this day.</p>
                  </div>
                ) : (
                  getTasksForDate(selectedDate).map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl bg-surface-hover border border-border flex items-start flex-col gap-1"
                    >
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">
                        Status: {task.status.replace("_", " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-5 border-t border-border bg-surface-hover/30">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newTaskTitle.trim() || isSubmitting) return;
                    setIsSubmitting(true);
                    try {
                      await fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: newTaskTitle,
                          dueDate: selectedDate.toISOString(),
                          workspaceId: activeWorkspaceId
                        }),
                      });
                      setNewTaskTitle("");
                      fetchTasks();
                      window.dispatchEvent(new Event("app-data-changed"));
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <input
                    type="text"
                    placeholder="Quick add task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full bg-surface border border-transparent focus:border-accent/30 focus:ring-2 focus:ring-accent/10 px-3 py-2 rounded-lg text-sm outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim() || isSubmitting}
                    className="w-full bg-accent hover:bg-accent/90 flex items-center justify-center h-9 text-white font-semibold py-2 rounded-lg text-sm transition-all disabled:opacity-50 min-w-[100px]"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      "Add to Date"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
