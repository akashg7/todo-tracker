"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { cn, getGreeting, priorityConfig } from "@/lib/utils";
import {
  CheckCircle2,
  Flame,
  Zap,
  TrendingUp,
  Clock,
  ChevronRight,
  Circle,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { ActivityFeed } from "@/components/workspace/activity-feed";
import { useUser } from "@clerk/nextjs";

import { useWorkspaceStore } from "@/stores/workspace-store";
import { useAppStore } from "@/stores/app-store";

interface DashboardData {
  stats: {
    tasksCompletedToday: number;
    totalTasks: number;
    currentStreak: number;
    productivityScore: number;
    habitsCompleted: number;
    habitsTotal: number;
  };
  todayTasks: any[];
  upcomingTasks: any[];
  habits: any[];
  todayHabitLogs: any[];
  recentActivity: any[];
}

const quotes = [
  "The secret of getting ahead is getting started.",
  "Focus on being productive instead of busy.",
  "Small daily improvements lead to stunning results.",
  "Discipline is choosing between what you want now and what you want most.",
  "You don't have to be great to start, but you have to start to be great.",
  "Productivity is never an accident. It's the result of commitment to excellence.",
  "The way to get started is to quit talking and begin doing.",
];

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const { activeWorkspaceId } = useWorkspaceStore();
  const { setSelectedTaskId } = useAppStore();

  const userName = user?.firstName || user?.username || "User";
  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  const fetchDashboard = useCallback(async () => {
    try {
      const wsFilter = activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : "";
      const res = await fetch(`/api/dashboard${wsFilter}`);
      if (res.status === 403) {
        window.location.href = "/onboarding";
        return;
      }
      if (res.status === 401) {
        window.location.href = "/sign-in";
        return;
      }
      const json = await res.json();
      if (json.error) {
        console.error(json.error);
        return;
      }
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchDashboard();
    
    const handleDataChange = () => fetchDashboard();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, [fetchDashboard]);

  async function completeTask(taskId: string) {
    setCompletingTask(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      });
      fetchDashboard();
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setCompletingTask(null), 500);
    }
  }

  async function toggleHabit(habitId: string, isCompleted: boolean) {
    try {
      const d = new Date();
      const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];

      await fetch(`/api/habits/${habitId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remove: isCompleted, date: localDate }),
      });
      fetchDashboard();
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: "Tasks Done",
      value: data.stats.tasksCompletedToday,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Current Streak",
      value: data.stats.currentStreak,
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      suffix: "days",
    },
    {
      label: "Productivity",
      value: data.stats.productivityScore,
      icon: Zap,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      suffix: "pts",
    },
    {
      label: "Habits",
      value: data.stats.habitsCompleted,
      icon: TrendingUp,
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      suffix: `/ ${data.stats.habitsTotal}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 via-surface to-surface border border-border p-6 sticky top-0 z-20 backdrop-blur-md"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {getGreeting()}, {userName} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm italic">&ldquo;{quote}&rdquo;</p>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="bg-surface border border-border rounded-2xl p-4 hover:border-border-hover transition-colors group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground animate-count-up">
              <AnimatedNumber value={stat.value} />
              {stat.suffix && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {stat.suffix}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Today&apos;s Tasks
            </h2>
            <Link
              href="/today"
              className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.todayTasks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-sm text-muted-foreground">All caught up! No tasks for today.</p>
              </div>
            ) : (
              data.todayTasks.slice(0, 6).map((task) => (
                <motion.div
                  key={task.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors group cursor-pointer" onClick={() => setSelectedTaskId(task.id)}
                >
                  <button
                    onClick={() => completeTask(task.id)}
                    className="shrink-0"
                  >
                    <motion.div
                      animate={completingTask === task.id ? { scale: [1, 1.3, 1], rotate: [0, 10, 0] } : {}}
                      transition={completingTask === task.id ? { duration: 0.4 } : { type: "spring", stiffness: 400 }}
                    >
                      {completingTask === task.id ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-accent transition-colors" />
                      )}
                    </motion.div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      completingTask === task.id ? "line-through text-muted-foreground" : "text-foreground"
                    )}>
                      {task.title}
                    </p>
                    {task.project && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: task.project.color }} />
                        <span className="text-[11px] text-muted-foreground">{task.project.name}</span>
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    priorityConfig[task.priority as keyof typeof priorityConfig]?.bg,
                    priorityConfig[task.priority as keyof typeof priorityConfig]?.text
                  )}>
                    P{task.priority}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Habit Check-in */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Habit Check-in
            </h2>
            <Link
              href="/habits"
              className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.habits.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <div className="text-3xl mb-2">🌱</div>
                <p className="text-sm text-muted-foreground">No habits yet. Create your first!</p>
              </div>
            ) : (
              data.habits.map((habit) => {
                const isCompleted = data.todayHabitLogs.some(
                  (log: any) => log.habitId === habit.id
                );
                return (
                  <motion.div
                    key={habit.id}
                    layout
                    className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <button
                      onClick={() => toggleHabit(habit.id, isCompleted)}
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0 transition-all duration-300",
                        isCompleted
                          ? "bg-emerald-500/20 scale-110"
                          : "bg-surface-hover hover:bg-surface-active"
                      )}
                    >
                      <motion.span
                        animate={isCompleted ? { scale: [1, 1.4, 1], rotate: [0, 10, 0] } : {}}
                        transition={isCompleted ? { duration: 0.4 } : { type: "spring", stiffness: 400 }}
                      >
                        {habit.icon}
                      </motion.span>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        isCompleted ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {habit.name}
                      </p>
                      {habit.streak > 0 && (
                        <p className="text-[11px] text-orange-400 flex items-center gap-1 mt-0.5">
                          <Flame className="w-3 h-3" />
                          {habit.streak} day streak
                        </p>
                      )}
                    </div>
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Upcoming
            </h2>
          </div>
          <div className="divide-y divide-border">
            {data.upcomingTasks.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
              </div>
            ) : (
              data.upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-hover transition-colors">
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{task.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-surface border border-border rounded-2xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-border">
            {data.recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              data.recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-sm text-muted-foreground flex-1 truncate">
                    Completed <span className="text-foreground">{item.title}</span>
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {item.completedAt
                      ? new Date(item.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
