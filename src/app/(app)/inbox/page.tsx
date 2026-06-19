"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, priorityConfig } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  LayoutGrid,
  List,
  Inbox as InboxIcon,
  PlayCircle,
  XCircle,
} from "lucide-react";

import { useWorkspaceStore } from "@/stores/workspace-store";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  dueDate: string | null;
  completedAt: string | null;
  projectId: string | null;
  parentId: string | null;
  order: number;
  project?: { id: string; name: string; color: string; icon: string } | null;
  _count?: { subtasks: number };
}

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState<number>(3);
  const [showNewTask, setShowNewTask] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [view, setView] = useState<"list" | "board">("list");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const [CompletingBulk, setCompletingBulk] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { activeWorkspaceId } = useWorkspaceStore();

  const getDepth = (taskId: string, depth = 0): number => {
    const t = tasks.find(x => x.id === taskId);
    if (!t || !t.parentId || depth > 5) return depth;
    return getDepth(t.parentId, depth + 1);
  };

  useEffect(() => {
    fetchTasks();
    const handleDataChange = () => fetchTasks();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, [filterStatus, activeWorkspaceId]);

  const fetchTasks = useCallback(async () => {
    try {
      const statusFilter = filterStatus === "all" ? "" : `status=${filterStatus}`;
      const wsFilter = activeWorkspaceId ? `&workspaceId=${activeWorkspaceId}` : "";
      const res = await fetch(`/api/tasks?${statusFilter}${wsFilter}`, { cache: "no-store" });
      if (res.status === 403) return (window.location.href = "/onboarding");
      if (res.status === 401) return (window.location.href = "/sign-in");
      const json = await res.json();
      if (Array.isArray(json)) setTasks(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, activeWorkspaceId]);

  async function updateTask(id: string, updates: any) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchTasks();
        window.dispatchEvent(new Event("app-data-changed"));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function bulkDelete() {
    for (const id of Array.from(selectedTasks)) {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    }
    setSelectedTasks(new Set());
    fetchTasks();
    window.dispatchEvent(new Event("app-data-changed"));
  }

  async function createTask() {
    if (!newTask.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title: newTask.trim(), 
          priority: newPriority,
          workspaceId: activeWorkspaceId
        }),
      });
      if (res.ok) {
        setNewTask("");
        setNewPriority(3);
        setShowNewTask(false);
        fetchTasks();
        window.dispatchEvent(new Event("app-data-changed"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  }

  async function updateTaskStatus(id: string, newStatus: string) {
    if (newStatus === "done") setCompletingId(id);
    setContextMenu(null);
    
    // Optimistic UI Update
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, status: newStatus } : t
    ));

    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setTimeout(() => {
        fetchTasks();
        if (newStatus === "done") setCompletingId(null);
        window.dispatchEvent(new Event("app-data-changed"));
      }, 400);
    } catch (err) {
      console.error(err);
      if (newStatus === "done") setCompletingId(null);
      fetchTasks();
    }
  }

  async function toggleTask(id: string, currentStatus: string) {
    setCompletingId(id);
    const newStatus = currentStatus === "done" ? "todo" : "done";
    
    // Auto-complete parent logic
    const t = tasks.find(x => x.id === id);
    if (t?.parentId && newStatus === "done") {
      const siblings = tasks.filter(x => x.parentId === t.parentId && x.id !== id);
      const allSiblingsDone = siblings.every(x => x.status === "done");
      if (allSiblingsDone) {
        await fetch(`/api/tasks/${t.parentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "done" }),
        });
      }
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
        );
        setTimeout(() => window.dispatchEvent(new Event("app-data-changed")), 400);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    updateTaskStatus(taskId, status);
  };

  async function deleteTask(id: string) {
    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      fetchTasks();
      window.dispatchEvent(new Event("app-data-changed"));
    } catch (err) {
      console.error(err);
    }
    setContextMenu(null);
  }

  const filtered = tasks.filter((t) =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 w-full rounded-xl" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-md pt-4 pb-2 -mt-4 mb-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <InboxIcon className="w-6 h-6 text-accent" />
            Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-border rounded-lg">
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 rounded-l-lg transition-colors",
                view === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("board")}
              className={cn(
                "p-2 rounded-r-lg transition-colors",
                view === "board" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2 bg-surface/50 border border-transparent shadow-sm focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/10 transition-all rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-xl px-1 py-1">
          {[
            { key: "active", label: "Active" },
            { key: "done", label: "Done" },
            { key: "cancelled", label: "Cancelled" },
            { key: "all", label: "All" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filterStatus === f.key
                  ? "bg-accent/10 text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task */}
      <AnimatePresence>
        {showNewTask ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-transparent shadow-sm focus-within:border-accent/40 focus-within:ring-2 focus-within:ring-accent/10 rounded-xl overflow-hidden transition-all"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Task name..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") createTask();
                  if (e.key === "Escape") setShowNewTask(false);
                }}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border-t border-border">
              <div className="flex gap-1">
                {([0, 1, 2, 3] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewPriority(p)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                      newPriority === p
                        ? `${priorityConfig[p].text} bg-surface-hover`
                        : "text-muted-foreground"
                    )}
                  >
                    P{p}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button onClick={() => setShowNewTask(false)} className="text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTask.trim() || isCreating}
                className="px-3 py-1 flex items-center justify-center rounded-lg text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 transition-colors min-w-[60px]"
              >
                {isCreating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  "Add"
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowNewTask(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent/30 hover:bg-surface transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Add a task
          </motion.button>
        )}
      </AnimatePresence>

      {/* Task List */}
      {view === "list" ? (
        <div className="space-y-1">
          <AnimatePresence>
            {filtered.map((task, index) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.02 }}
                tabIndex={0}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ id: task.id, x: e.clientX, y: e.clientY });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    if (e.shiftKey) {
                      const parent = tasks.find(x => x.id === task.parentId);
                      if (parent) updateTask(task.id, { parentId: parent.parentId });
                      else updateTask(task.id, { parentId: null });
                    } else if (index > 0) {
                      updateTask(task.id, { parentId: filtered[index - 1].id });
                    }
                  }
                }}
                style={{ marginLeft: `${getDepth(task.id) * 24}px` }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group outline-none focus:ring-1 focus:ring-accent/40",
                  "hover:bg-surface border border-transparent hover:border-border",
                  completingId === task.id && "bg-emerald-500/5",
                  selectedTasks.has(task.id) && "bg-accent/5 border-accent/20"
                )}
              >
                {/* Multi-Select Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = new Set(selectedTasks);
                    if (next.has(task.id)) next.delete(task.id);
                    else next.add(task.id);
                    setSelectedTasks(next);
                  }}
                  className={cn("w-4 h-4 rounded border transition-all shrink-0 ml-1 mr-[-4px]", selectedTasks.has(task.id) ? "bg-accent border-accent text-white" : "border-muted opacity-0 group-hover:opacity-100")}
                >
                  {selectedTasks.has(task.id) && <CheckCircle2 className="w-4 h-4" />}
                </button>
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task.id, task.status)}
                  className="shrink-0"
                >
                  <motion.div
                    animate={
                      completingId === task.id
                        ? { scale: [1, 1.4, 1], rotate: [0, 10, 0] }
                        : {}
                    }
                    transition={completingId === task.id ? { duration: 0.4 } : { type: "spring", stiffness: 400 }}
                  >
                    {task.status === "done" || completingId === task.id ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle
                        className="w-5 h-5 text-muted-foreground hover:text-accent transition-colors"
                        style={{
                          color:
                            task.priority <= 1
                              ? priorityConfig[task.priority as keyof typeof priorityConfig].color
                              : undefined,
                        }}
                      />
                    )}
                  </motion.div>
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm transition-all",
                      task.status === "done"
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    )}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.project && (
                      <div className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-sm"
                          style={{ backgroundColor: task.project.color }}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {task.project.name}
                        </span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}
                    {task._count && task._count.subtasks > 0 && (
                      <div className="flex items-center gap-1.5 bg-surface border border-border px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground">
                        <span>{tasks.filter(t => t.parentId === task.id && t.status === "done").length}/{tasks.filter(t => t.parentId === task.id).length}</span>
                        <div className="w-12 h-1.5 bg-surface-hover rounded-full overflow-hidden">
                           <div className="h-full bg-accent" style={{ width: `${(tasks.filter(t => t.parentId === task.id && t.status === "done").length / Math.max(tasks.filter(t => t.parentId === task.id).length, 1)) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority Badge */}
                <div
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0",
                    priorityConfig[task.priority as keyof typeof priorityConfig]?.bg,
                    priorityConfig[task.priority as keyof typeof priorityConfig]?.text
                  )}
                >
                  P{task.priority}
                </div>

                {/* Actions */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu({ id: task.id, x: e.clientX, y: e.clientY });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">📮</div>
              <h3 className="text-lg font-semibold text-foreground">Your inbox is empty</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first task to get started</p>
            </div>
          )}
        </div>
      ) : (
        /* Board View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(["todo", "in_progress", "done", "cancelled"] as const).map((status) => {
            const statusTasks = filtered.filter((t) => t.status === status);
            const labels: Record<string, string> = {
              todo: "To Do",
              in_progress: "In Progress",
              done: "Done",
              cancelled: "Cancelled",
            };
            const colors: Record<string, string> = {
              todo: "bg-blue-500",
              in_progress: "bg-yellow-500",
              done: "bg-emerald-500",
              cancelled: "bg-gray-500",
            };
            return (
              <div 
                key={status} 
                className="space-y-2 h-full min-h-[500px]"
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className={cn("w-2 h-2 rounded-full", colors[status])} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {labels[status]}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {statusTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {statusTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e: any) => e.dataTransfer.setData("taskId", task.id)}
                      className="bg-surface border border-border rounded-xl p-3 hover:border-border-hover transition-colors cursor-grab active:cursor-grabbing shadow-sm"
                    >
                      <p className="text-sm text-foreground">{task.title}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            priorityConfig[task.priority as keyof typeof priorityConfig]?.bg,
                            priorityConfig[task.priority as keyof typeof priorityConfig]?.text
                          )}
                        >
                          P{task.priority}
                        </div>
                        {task.project && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: task.project.color }} />
                            <span className="text-[10px] text-muted-foreground">{task.project.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Actions */}
      <AnimatePresence>
        {selectedTasks.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur-xl border border-border shadow-2xl px-6 py-4 rounded-3xl flex items-center gap-6"
          >
            <span className="text-sm font-semibold">{selectedTasks.size} selected</span>
            <button onClick={bulkDelete} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
              Delete Selected
            </button>
            <button onClick={() => setSelectedTasks(new Set())} className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu Modal */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setContextMenu(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 bg-surface border border-border rounded-xl shadow-2xl py-1 min-w-[160px]"
              style={{ position: "fixed", left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 180 : contextMenu.x), top: contextMenu.y }}
            >
              <div className="flex flex-col">
                <button
                  onClick={() => updateTaskStatus(contextMenu.id, "todo")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
                >
                  <Circle className="w-4 h-4 text-muted-foreground" />
                  Mark To Do
                </button>
              <button
                onClick={() => updateTaskStatus(contextMenu.id, "in_progress")}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                <PlayCircle className="w-4 h-4 text-yellow-500" />
                Mark In Progress
              </button>
              <button
                onClick={() => updateTaskStatus(contextMenu.id, "done")}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Mark Done
              </button>
              <button
                onClick={() => updateTaskStatus(contextMenu.id, "cancelled")}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface-hover transition-colors"
              >
                <XCircle className="w-4 h-4 text-gray-400" />
                Cancel Task
              </button>
              <div className="h-px bg-border my-1 mx-2" />
              <button
                onClick={() => deleteTask(contextMenu.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
