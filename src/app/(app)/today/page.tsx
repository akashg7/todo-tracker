"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn, priorityConfig } from "@/lib/utils";
import { Sun, CheckCircle2, Circle, AlertTriangle, Clock } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAppStore } from "@/stores/app-store";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  project?: { id: string; name: string; color: string } | null;
}

export default function TodayPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { setSelectedTaskId } = useAppStore();

  useEffect(() => {
    fetchTodayTasks();
    const handleDataChange = () => fetchTodayTasks();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, [activeWorkspaceId]);

  const fetchTodayTasks = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const wsFilter = activeWorkspaceId ? `&workspaceId=${activeWorkspaceId}` : "";
      const res = await fetch(
        `/api/tasks?status=todo,in_progress&dueBefore=${tomorrow.toISOString()}${wsFilter}`
      );
      if (res.status === 403) return (window.location.href = "/onboarding");
      if (res.status === 401) return (window.location.href = "/sign-in");
      const json = await res.json();
      setTasks(json.filter((t: Task) => t.dueDate !== null));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  async function toggleTask(id: string) {
    setCompletingId(id);
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      setTimeout(() => {
        fetchTodayTasks();
        setCompletingId(null);
        window.dispatchEvent(new Event("app-data-changed"));
      }, 400);
    } catch (err) {
      console.error(err);
      setCompletingId(null);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < today);
  const dueToday = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= today && d < new Date(today.getTime() + 86400000);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-16 w-full rounded-xl" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const renderTaskGroup = (title: string, icon: React.ReactNode, groupTasks: Task[], color: string) => {
    if (groupTasks.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className={cn("flex items-center gap-2 px-2 py-2 text-sm font-semibold", color)}>
          {icon}
          {title}
          <span className="text-xs font-normal text-muted-foreground ml-1">
            ({groupTasks.length})
          </span>
        </div>
        {groupTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface transition-colors group cursor-pointer" onClick={() => setSelectedTaskId(task.id)}
          >
            <button onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }} className="shrink-0">
              <motion.div
                animate={
                  completingId === task.id
                    ? { scale: [1, 1.4, 1], rotate: [0, 10, 0] }
                    : {}
                }
                transition={completingId === task.id ? { duration: 0.4 } : { type: "spring", stiffness: 400 }}
              >
                {completingId === task.id ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-accent transition-colors" />
                )}
              </motion.div>
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm", completingId === task.id ? "line-through text-muted-foreground" : "text-foreground")}>
                {task.title}
              </p>
              {task.project && (
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: task.project.color }} />
                  <span className="text-[11px] text-muted-foreground">{task.project.name}</span>
                </div>
              )}
            </div>
            <div className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full",
              priorityConfig[task.priority as keyof typeof priorityConfig]?.bg,
              priorityConfig[task.priority as keyof typeof priorityConfig]?.text
            )}>
              P{task.priority}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sun className="w-6 h-6 text-amber-400" />
          Today
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {" · "}
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </p>
      </motion.div>

      {tasks.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-5xl mb-4">☀️</div>
          <h3 className="text-lg font-semibold text-foreground">You&apos;re all clear!</h3>
          <p className="text-sm text-muted-foreground mt-1">No tasks due today. Enjoy your day!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {renderTaskGroup("Overdue", <AlertTriangle className="w-4 h-4" />, overdue, "text-red-400")}
          {renderTaskGroup("Due Today", <Clock className="w-4 h-4" />, dueToday, "text-blue-400")}
        </div>
      )}
    </div>
  );
}
