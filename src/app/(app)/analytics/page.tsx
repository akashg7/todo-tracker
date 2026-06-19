"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, Target, Calendar, Flame } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsData {
  stats: {
    tasksCompletedToday: number;
    totalTasks: number;
    currentStreak: number;
    productivityScore: number;
    habitsCompleted: number;
    habitsTotal: number;
  };
  recentActivity: any[];
}

const CHART_COLORS = ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { activeWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    fetchData();
    const handleDataChange = () => fetchData();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, [activeWorkspaceId]);

  async function fetchData() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

      const wsFilter = activeWorkspaceId ? `workspaceId=${activeWorkspaceId}` : "";
      const wsQuery = wsFilter ? `?${wsFilter}` : "";
      const wsAmp = wsFilter ? `&${wsFilter}` : "";

      const [dashRes, tasksRes, habitsRes, logsRes] = await Promise.all([
        fetch(`/api/dashboard${wsQuery}`),
        fetch(`/api/tasks?status=done${wsAmp}`),
        fetch(`/api/habits`),
        fetch(`/api/habits/logs?startDate=${thirtyDaysAgo}&endDate=${today}`),
      ]);

      if (dashRes.status === 403 || tasksRes.status === 403 || habitsRes.status === 403 || logsRes.status === 403) {
        return (window.location.href = "/onboarding");
      }
      if (dashRes.status === 401 || tasksRes.status === 401 || habitsRes.status === 401 || logsRes.status === 401) {
        return (window.location.href = "/sign-in");
      }

      const [dashData, tasksData, habitsData, logsData] = await Promise.all([
        dashRes.json(),
        tasksRes.json(),
        habitsRes.json(),
        logsRes.json(),
      ]);

      if (!dashData.error) setData(dashData);
      if (Array.isArray(tasksData)) setTasks(tasksData);
      if (Array.isArray(habitsData)) setHabits(habitsData);
      if (Array.isArray(logsData)) setHabitLogs(logsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Generate daily completion data for last 14 days
  const dailyCompletions = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = tasks.filter((t: any) => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).toISOString().split("T")[0] === dateStr;
      }).length;
      days.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        tasks: count,
      });
    }
    return days;
  }, [tasks]);

  // Productivity score trend (simulated from task completions)
  const productivityTrend = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const taskCount = tasks.filter((t: any) => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).toISOString().split("T")[0] === dateStr;
      }).length;
      const habitCount = habitLogs.filter((l: any) => l.date === dateStr).length;
      days.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: Math.min(100, taskCount * 15 + habitCount * 10 + 20),
      });
    }
    return days;
  }, [tasks, habitLogs]);

  // Project distribution
  const projectDistribution = useMemo(() => {
    const projectCounts: Record<string, { name: string; count: number; color: string }> = {};
    tasks.forEach((t: any) => {
      const name = t.project?.name || "No Project";
      const color = t.project?.color || "#6B7280";
      if (!projectCounts[name]) projectCounts[name] = { name, count: 0, color };
      projectCounts[name].count++;
    });
    return Object.values(projectCounts);
  }, [tasks]);

  // Habit completion rates
  const habitCompletionRates = useMemo(() => {
    return habits.map((h: any) => {
      const logs = habitLogs.filter((l: any) => l.habitId === h.id).length;
      return {
        name: h.name,
        icon: h.icon,
        rate: Math.round((logs / 30) * 100),
        color: h.color,
      };
    });
  }, [habits, habitLogs]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-16 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold text-foreground">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-accent" />
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your productivity insights</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tasks Completed", value: tasks.length, icon: Target, color: "text-emerald-400" },
          { label: "Current Streak", value: data.stats.currentStreak, icon: Flame, color: "text-orange-400", suffix: "d" },
          { label: "Productivity", value: data.stats.productivityScore, icon: TrendingUp, color: "text-violet-400", suffix: "pts" },
          { label: "Active Habits", value: habits.length, icon: Calendar, color: "text-blue-400" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-surface border border-border rounded-2xl p-4"
          >
            <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} />
            <div className="text-2xl font-bold text-foreground">
              {stat.value}
              {stat.suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{stat.suffix}</span>}
            </div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Productivity Score Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Productivity Score (30d)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={productivityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} interval={6} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--accent)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Tasks Completed Per Day */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            Tasks Completed (14d)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyCompletions}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-fg)" }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-fg)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="tasks"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Project Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-surface border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Completion by Project
          </h3>
          {projectDistribution.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={projectDistribution}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {projectDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {projectDistribution.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                    <span className="text-sm text-foreground flex-1">{p.name}</span>
                    <span className="text-sm text-muted-foreground">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          )}
        </motion.div>

        {/* Habit Completion Rates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-surface border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Habit Completion Rate (30d)
          </h3>
          <div className="space-y-3">
            {habitCompletionRates.map((h, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground flex items-center gap-2">
                    <span>{h.icon}</span>
                    {h.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{h.rate}%</span>
                </div>
                <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${h.rate}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: h.color }}
                  />
                </div>
              </div>
            ))}
            {habitCompletionRates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No habits tracked yet</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
