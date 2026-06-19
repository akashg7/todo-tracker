"use client";

import { create } from "zustand";

export type TaskPriority = 0 | 1 | 2 | 3;
export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  parentId: string | null;
  projectId: string | null;
  userId: string;
  order: number;
  recurrence: string | null;
  estimatedMins: number | null;
  createdAt: string;
  updatedAt: string;
  subtasks?: Task[];
  project?: { id: string; name: string; color: string; icon: string } | null;
  labels?: { label: { id: string; name: string; color: string } }[];
  _count?: { subtasks: number };
}

interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  isDetailOpen: boolean;
  isQuickAddOpen: boolean;
  filter: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    projectId?: string;
    search?: string;
  };

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  removeTask: (id: string) => void;
  selectTask: (id: string | null) => void;
  toggleDetail: (open?: boolean) => void;
  toggleQuickAdd: (open?: boolean) => void;
  setFilter: (filter: Partial<TaskState["filter"]>) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  selectedTaskId: null,
  isDetailOpen: false,
  isQuickAddOpen: false,
  filter: {},

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),

  updateTask: (id, data) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...data } : t
      ),
    })),

  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
      isDetailOpen: state.selectedTaskId === id ? false : state.isDetailOpen,
    })),

  selectTask: (id) =>
    set({
      selectedTaskId: id,
      isDetailOpen: id !== null,
    }),

  toggleDetail: (open) =>
    set((state) => ({
      isDetailOpen: open ?? !state.isDetailOpen,
    })),

  toggleQuickAdd: (open) =>
    set((state) => ({
      isQuickAddOpen: open ?? !state.isQuickAddOpen,
    })),

  setFilter: (filter) =>
    set((state) => ({
      filter: { ...state.filter, ...filter },
    })),
}));
