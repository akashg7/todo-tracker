"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Target,
  CheckCircle2,
  Flame,
  Plus,
  TrendingUp,
  Calendar,
  BarChart3,
  Grid3X3,
  X,
} from "lucide-react";

interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  targetCount: number;
  category: string;
  streak: number;
  longestStreak: number;
}

interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  count: number;
}

type TabType = "daily" | "weekly" | "heatmap" | "monthly";

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("daily");
  const [showCreate, setShowCreate] = useState(false);
  const [isCreatingHabit, setIsCreatingHabit] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", icon: "✅", color: "#8B5CF6" });
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const _d = new Date();
  const today = new Date(_d.getTime() - (_d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];

  useEffect(() => {
    fetchData();
    const handleDataChange = () => fetchData();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        fetch("/api/habits"),
        fetch(`/api/habits/logs?startDate=${getDateOffset(-365)}&endDate=${today}`),
      ]);
      
      if (habitsRes.status === 403 || logsRes.status === 403) return (window.location.href = "/onboarding");
      if (habitsRes.status === 401 || logsRes.status === 401) return (window.location.href = "/sign-in");

      const [habitsData, logsData] = await Promise.all([habitsRes.json(), logsRes.json()]);
      setHabits(habitsData);
      setLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  async function toggleHabit(habitId: string) {
    const todayLog = logs.find((l) => l.habitId === habitId && l.date === today);
    try {
      await fetch(`/api/habits/${habitId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, remove: !!todayLog }),
      });
      fetchData();
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error(err);
    }
  }

  async function createHabit() {
    if (!newHabit.name.trim() || isCreatingHabit) return;
    setIsCreatingHabit(true);
    try {
      await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHabit),
      });
      setNewHabit({ name: "", icon: "✅", color: "#8B5CF6" });
      setShowCreate(false);
      fetchData();
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingHabit(false);
    }
  }

  async function updateHabit() {
    if (!editingHabit || !editingHabit.name.trim()) return;
    try {
      await fetch(`/api/habits/${editingHabit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingHabit),
      });
      setEditingHabit(null);
      fetchData();
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error(err);
    }
    setContextMenu(null);
  }
  async function deleteHabit(id: string) {
    try {
      await fetch(`/api/habits/${id}`, { method: "DELETE" });
      setContextMenu(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  }

  function getDateOffset(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  function isHabitCompletedOn(habitId: string, date: string) {
    return logs.some((l) => l.habitId === habitId && l.date === date);
  }

  const tabs: { key: TabType; label: string; icon: typeof Target }[] = [
    { key: "daily", label: "Daily", icon: CheckCircle2 },
    { key: "weekly", label: "Weekly", icon: TrendingUp },
    { key: "heatmap", label: "Heatmap", icon: Grid3X3 },
    { key: "monthly", label: "Monthly", icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md pt-4 pb-2 -mt-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-accent" />
            Habits
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {habits.length} habit{habits.length !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Habit
        </button>
      </motion.div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center",
              tab === t.key ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Create Dialog */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-accent/30 rounded-xl overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">New Habit</h3>
                <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newHabit.icon}
                  onChange={(e) => setNewHabit({ ...newHabit, icon: e.target.value })}
                  className="w-12 h-12 text-2xl text-center bg-surface-hover rounded-xl border border-border outline-none focus:border-accent"
                />
                <input
                  autoFocus
                  type="text"
                  placeholder="Habit name..."
                  value={newHabit.name}
                  onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && createHabit()}
                  className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground border-b border-border focus:border-accent pb-1"
                />
              </div>
              <div className="flex items-center gap-2">
                {["#8B5CF6", "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#EC4899", "#06B6D4"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewHabit({ ...newHabit, color: c })}
                    className={cn("w-6 h-6 rounded-full transition-transform", newHabit.color === c && "scale-125 ring-2 ring-offset-2 ring-offset-background")}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="flex-1" />
                <button onClick={createHabit} disabled={!newHabit.name.trim() || isCreatingHabit} className="px-4 py-1.5 flex items-center justify-center rounded-lg text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors min-w-[70px]">
                  {isCreatingHabit ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingHabit && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setEditingHabit(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface border border-border rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-foreground">Edit Habit</h3>
                  <button onClick={() => setEditingHabit(null)} className="p-2 text-muted-foreground hover:bg-surface-hover rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Habit name"
                    value={editingHabit.name}
                    onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                    className="w-full bg-surface-hover/50 text-foreground text-sm px-3 py-2 border-none rounded-lg outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Icon (emoji)"
                      value={editingHabit.icon}
                      onChange={(e) => setEditingHabit({ ...editingHabit, icon: e.target.value })}
                      className="w-16 text-center bg-surface-hover/50 text-foreground text-sm px-3 py-2 border-none rounded-lg outline-none focus:ring-2 focus:ring-accent/40"
                      maxLength={2}
                    />
                    <input
                      type="color"
                      value={editingHabit.color}
                      onChange={(e) => setEditingHabit({ ...editingHabit, color: e.target.value })}
                      className="w-12 h-[36px] bg-transparent rounded-lg cursor-pointer border-none"
                    />
                  </div>
                  <button
                    onClick={updateHabit}
                    disabled={!editingHabit.name.trim()}
                    className="w-full mt-4 bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => deleteHabit(editingHabit.id)}
                    className="w-full mt-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold py-2.5 rounded-xl transition-all"
                  >
                    Delete Habit permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      {tab === "daily" && <DailyView habits={habits} logs={logs} today={today} onToggle={toggleHabit} isCompleted={isHabitCompletedOn} setContextMenu={setContextMenu} setEditingHabit={setEditingHabit} contextMenu={contextMenu} deleteHabit={deleteHabit} />}
      {tab === "weekly" && <WeeklyView habits={habits} logs={logs} isCompleted={isHabitCompletedOn} />}
      {tab === "heatmap" && <HeatmapView habits={habits} logs={logs} />}
      {tab === "monthly" && <MonthlyView habits={habits} logs={logs} isCompleted={isHabitCompletedOn} />}

      {habits.length === 0 && (
        <div className="py-16 text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h3 className="text-lg font-semibold text-foreground">No habits yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Start building better habits today</p>
        </div>
      )}
    </div>
  );
}

// ===== DAILY VIEW =====
function DailyView({ habits, logs, today, onToggle, isCompleted, setContextMenu, setEditingHabit, contextMenu, deleteHabit }: any) {
  const completed = habits.filter((h: Habit) => isCompleted(h.id, today)).length;
  const progress = habits.length > 0 ? (completed / habits.length) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Today&apos;s Progress</span>
          <span className="text-sm font-semibold text-foreground">{completed}/{habits.length}</span>
        </div>
        <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full"
          />
        </div>
      </div>

      {/* Habit List */}
      {habits.map((habit: Habit, index: number) => {
        const done = isCompleted(habit.id, today);
        return (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onToggle(habit.id)}
            className={cn(
              "group flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all cursor-pointer",
              done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-surface border-border hover:border-border-hover"
            )}
          >
            <motion.div
              animate={done ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={done ? { duration: 0.3 } : { type: "spring", stiffness: 400 }}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-colors",
                done ? "bg-emerald-500/20" : "bg-surface-hover"
              )}
            >
              {habit.icon}
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className={cn("font-medium", done ? "text-muted-foreground" : "text-foreground")}>
                {habit.name}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {habit.streak > 0 && (
                  <span className="text-xs text-orange-400 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {habit.streak} day streak
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Best: {habit.longestStreak} days
                </span>
              </div>
            </div>
            <motion.div
              animate={done ? { scale: [0, 1.2, 1] } : { scale: 1 }}
              transition={done ? { duration: 0.3 } : { type: "spring", stiffness: 400 }}
              className="mr-3"
            >
              {done ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/30" />
              )}
            </motion.div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({ id: habit.id, x: e.clientX, y: e.clientY });
              }}
              className="p-2 rounded-lg text-muted-foreground hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100"
            >
              <div className="flex gap-0.5">
                <div className="w-1 h-1 bg-current rounded-full" />
                <div className="w-1 h-1 bg-current rounded-full" />
                <div className="w-1 h-1 bg-current rounded-full" />
              </div>
            </button>
          </motion.div>
        );
      })}

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ position: "fixed", left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 180 : contextMenu.x), top: contextMenu.y }}
            className="z-50 bg-surface border border-border rounded-xl shadow-xl py-1 min-w-[160px]"
          >
            <div className="flex flex-col">
              <button
                onClick={() => {
                  const h = habits.find((x: Habit) => x.id === contextMenu.id);
                  if (h) setEditingHabit(h);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-surface-hover text-sm"
              >
                Edit Habit
              </button>
              <div className="h-px bg-border my-1 mx-2" />
              <button
                onClick={() => deleteHabit(contextMenu.id)}
                className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-500 text-sm"
              >
                Delete Habit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== WEEKLY VIEW =====
function WeeklyView({ habits, logs, isCompleted }: any) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        day: d.getDate(),
      });
    }
    return result;
  }, []);

  return (
    <div className="space-y-4">
      {habits.map((habit: Habit) => {
        const weekCompleted = days.filter((d) => isCompleted(habit.id, d.date)).length;
        const progress = (weekCompleted / 7) * 100;

        return (
          <motion.div
            key={habit.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-surface border border-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{habit.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-foreground">{habit.name}</p>
                <p className="text-xs text-muted-foreground">{weekCompleted}/7 this week</p>
              </div>
              {/* Circular progress */}
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-surface-hover"
                  />
                  <motion.path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={habit.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${progress}, 100`}
                    initial={{ strokeDasharray: "0, 100" }}
                    animate={{ strokeDasharray: `${progress}, 100` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {days.map((d) => {
                const done = isCompleted(habit.id, d.date);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{d.label}</span>
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
                        done ? "text-white" : "bg-surface-hover text-muted-foreground"
                      )}
                      style={done ? { backgroundColor: habit.color } : undefined}
                    >
                      {d.day}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ===== HEATMAP VIEW =====
function HeatmapView({ habits, logs }: any) {
  const weeks = useMemo(() => {
    const result: string[][] = [];
    let current: string[] = [];
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    for (let i = 0; i < 371; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      current.push(d.toISOString().split("T")[0]);
      if (current.length === 7) {
        result.push(current);
        current = [];
      }
    }
    if (current.length) result.push(current);
    return result;
  }, []);

  // Count completions per day across all habits
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((l: HabitLog) => {
      counts[l.date] = (counts[l.date] || 0) + 1;
    });
    return counts;
  }, [logs]);

  const maxCount = Math.max(1, ...Object.values(dayCounts));

  function getColor(count: number): string {
    if (count === 0) return "var(--surface-hover)";
    const intensity = count / maxCount;
    if (intensity < 0.25) return "#1e3a2f";
    if (intensity < 0.5) return "#2d6a4f";
    if (intensity < 0.75) return "#40916c";
    return "#52b788";
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 overflow-x-auto">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Grid3X3 className="w-4 h-4 text-accent" />
        Annual Overview — All Habits
      </h3>
      <div className="flex gap-[3px] min-w-[700px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((date) => {
              const count = dayCounts[date] || 0;
              return (
                <div
                  key={date}
                  className="w-[13px] h-[13px] rounded-[3px] transition-colors"
                  style={{ backgroundColor: getColor(count) }}
                  title={`${date}: ${count} habit${count !== 1 ? "s" : ""} completed`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((i) => (
          <div
            key={i}
            className="w-[13px] h-[13px] rounded-[3px]"
            style={{ backgroundColor: getColor(i * maxCount) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ===== MONTHLY VIEW =====
function MonthlyView({ habits, logs, isCompleted }: any) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());

  const days = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return d.toISOString().split("T")[0];
    });
  }, [month, year]);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button
          onClick={() => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ←
        </button>
        <span className="text-sm font-semibold text-foreground">
          {new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button
          onClick={() => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          →
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-muted-foreground font-medium sticky left-0 bg-surface min-w-[120px]">Habit</th>
              {days.map((d) => (
                <th key={d} className="px-1 py-2 text-muted-foreground font-medium text-center min-w-[28px]">
                  {new Date(d).getDate()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((habit: Habit) => (
              <tr key={habit.id} className="border-b border-border/50">
                <td className="px-3 py-2 sticky left-0 bg-surface">
                  <div className="flex items-center gap-2">
                    <span>{habit.icon}</span>
                    <span className="text-foreground truncate max-w-[80px]">{habit.name}</span>
                  </div>
                </td>
                {days.map((d) => {
                  const done = isCompleted(habit.id, d);
                  return (
                    <td key={d} className="px-1 py-2 text-center">
                      <div
                        className={cn(
                          "w-5 h-5 rounded mx-auto",
                          done ? "" : "bg-surface-hover"
                        )}
                        style={done ? { backgroundColor: habit.color + "80" } : undefined}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Daily percentage row */}
            <tr>
              <td className="px-3 py-2 text-muted-foreground font-medium sticky left-0 bg-surface">Daily %</td>
              {days.map((d) => {
                const completed = habits.filter((h: Habit) => isCompleted(h.id, d)).length;
                const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
                return (
                  <td key={d} className="px-1 py-2 text-center text-[10px]">
                    <span className={cn(pct === 100 ? "text-emerald-400 font-bold" : "text-muted-foreground")}>
                      {pct}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
