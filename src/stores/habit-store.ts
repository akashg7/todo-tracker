"use client";

import { create } from "zustand";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  frequencyDays: string;
  targetCount: number;
  category: string;
  userId: string;
  streak: number;
  longestStreak: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  count: number;
  completedAt: string;
}

interface HabitState {
  habits: Habit[];
  logs: Record<string, HabitLog[]>; // keyed by date YYYY-MM-DD
  selectedDate: string;

  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, data: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  setLogs: (date: string, logs: HabitLog[]) => void;
  addLog: (log: HabitLog) => void;
  removeLog: (habitId: string, date: string) => void;
  setSelectedDate: (date: string) => void;
}

export const useHabitStore = create<HabitState>((set) => ({
  habits: [],
  logs: {},
  selectedDate: new Date().toISOString().split("T")[0],

  setHabits: (habits) => set({ habits }),
  addHabit: (habit) => set((s) => ({ habits: [...s.habits, habit] })),
  updateHabit: (id, data) =>
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...data } : h)),
    })),
  removeHabit: (id) =>
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
  setLogs: (date, logs) =>
    set((s) => ({ logs: { ...s.logs, [date]: logs } })),
  addLog: (log) =>
    set((s) => {
      const existing = s.logs[log.date] || [];
      return {
        logs: {
          ...s.logs,
          [log.date]: [...existing.filter((l) => l.habitId !== log.habitId), log],
        },
      };
    }),
  removeLog: (habitId, date) =>
    set((s) => {
      const existing = s.logs[date] || [];
      return {
        logs: {
          ...s.logs,
          [date]: existing.filter((l) => l.habitId !== habitId),
        },
      };
    }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
