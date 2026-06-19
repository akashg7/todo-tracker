import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  if (days < 0 && days > -7) return `In ${Math.abs(days)} days`;
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function generateId(): string {
  return crypto.randomUUID();
}

export const priorityConfig = {
  0: { label: "Urgent", color: "#EF4444", bg: "bg-red-500/10", text: "text-red-500" },
  1: { label: "High", color: "#F97316", bg: "bg-orange-500/10", text: "text-orange-500" },
  2: { label: "Medium", color: "#3B82F6", bg: "bg-blue-500/10", text: "text-blue-500" },
  3: { label: "Low", color: "#6B7280", bg: "bg-gray-500/10", text: "text-gray-400" },
} as const;

export const statusConfig = {
  todo: { label: "To Do", icon: "circle" },
  in_progress: { label: "In Progress", icon: "clock" },
  done: { label: "Done", icon: "check-circle" },
  cancelled: { label: "Cancelled", icon: "x-circle" },
} as const;
