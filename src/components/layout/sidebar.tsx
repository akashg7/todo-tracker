"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { useTaskStore } from "@/stores/task-store";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  CalendarDays,
  Sun,
  BarChart3,
  Settings,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Target,
  Search,
  Plus,
  ChevronDown,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { CreateWorkspaceModal } from "@/components/workspaces/create-modal";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/today", label: "Today", icon: Sun },
  { href: "/habits", label: "Habits", icon: Target },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const bottomNav = [
  { href: "#notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, toggleNotificationsPanel } = useAppStore();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [showWorkspaceSwitcher, setShowWorkspaceSwitcher] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const { workspaces, activeWorkspaceId, setWorkspaces, setActiveWorkspace } = useWorkspaceStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const [projects, setProjects] = useState<any[]>([]);
  const [p0Count, setP0Count] = useState(0);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const res = await fetch("/api/workspaces");
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data);
          const currentActiveId = useWorkspaceStore.getState().activeWorkspaceId;
          const isValid = currentActiveId && data.some((w: any) => w.id === currentActiveId);
          if (data.length > 0 && !isValid) {
            useWorkspaceStore.getState().setActiveWorkspace(data[0].id);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setProjects([]);
      setP0Count(0);
      return;
    }
    async function fetchData() {
      try {
        const [projRes, tasksRes] = await Promise.all([
          fetch(`/api/projects?workspaceId=${activeWorkspaceId}`),
          fetch(`/api/tasks?priority=0&workspaceId=${activeWorkspaceId}`)
        ]);
        if (projRes.ok) {
          const projs = await projRes.json();
          setProjects(projs);
        }
        if (tasksRes.ok) {
          const tasks = await tasksRes.json();
          setP0Count(tasks.length);
        }
      } catch (err) {
        console.error("Failed to fetch sidebar data:", err);
      }
    }
    fetchData();
    
    const handleDataChange = () => fetchData();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, [activeWorkspaceId]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col",
        "bg-sidebar border-r border-sidebar-border",
        "select-none overflow-hidden"
      )}
    >
      {/* Logo / Brand & Workspace Switcher */}
      <div className="relative flex flex-col px-4 pt-4 pb-2 border-b border-sidebar-border shrink-0">
        <button
          onClick={() => !sidebarCollapsed && setShowWorkspaceSwitcher(!showWorkspaceSwitcher)}
          className={cn(
            "flex items-center gap-3 w-full hover:bg-surface-hover p-2 rounded-lg transition-colors overflow-hidden",
            sidebarCollapsed && "justify-center px-0"
          )}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold"
            style={{ backgroundColor: activeWorkspace?.color || "#8B5CF6" }}
          >
            {activeWorkspace ? activeWorkspace.name.substring(0, 1).toUpperCase() : <Zap className="w-4 h-4" />}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between flex-1 overflow-hidden"
              >
                <div className="flex flex-col text-left">
                  <span className="text-foreground font-semibold text-sm tracking-tight truncate">
                    {activeWorkspace?.name || "LifeOS"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {showWorkspaceSwitcher && !sidebarCollapsed && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowWorkspaceSwitcher(false)}
                className="fixed inset-0 z-[60]"
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute top-full left-4 mt-2 w-64 bg-surface border border-border rounded-xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[300px]"
              >
                <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 bg-surface-hover/50 pb-1">
                  Workspaces
                </div>
                <div className="overflow-y-auto px-2 py-1 max-h-48 space-y-1">
                  {workspaces.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setActiveWorkspace(w.id);
                        setShowWorkspaceSwitcher(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm text-foreground transition-colors hover:bg-surface-hover",
                        activeWorkspaceId === w.id && "bg-accent/10 text-accent font-medium hover:bg-accent/20"
                      )}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: w.color }}
                      >
                        {w.name.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left truncate">{w.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-border p-2 bg-surface-hover/30">
                  <button
                    onClick={() => {
                      setShowWorkspaceSwitcher(false);
                      setIsCreateModalOpen(!isCreateModalOpen);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Create Workspace</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pt-3"
          >
            <button
              onClick={() => useAppStore.getState().toggleCommandPalette()}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                "text-muted-foreground bg-surface hover:bg-surface-hover",
                "transition-colors duration-150 border border-border",
                "hover:border-border-hover"
              )}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border bg-background">
                ⌘K
              </kbd>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Add */}
      <div className="px-3 pt-3">
        <button
          onClick={() => {
            useTaskStore.getState().toggleQuickAdd(true);
          }}
          className={cn(
            "flex items-center gap-2 rounded-lg text-sm font-medium",
            "text-accent-foreground bg-accent hover:bg-accent/90",
            "transition-all duration-150",
            sidebarCollapsed
              ? "w-10 h-10 justify-center mx-auto"
              : "w-full px-3 py-2"
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                New Task
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium",
                "transition-all duration-150 group relative",
                sidebarCollapsed
                  ? "w-10 h-10 justify-center mx-auto"
                  : "px-3 py-2",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-hover"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon
                className={cn("w-[18px] h-[18px] shrink-0", {
                  "text-accent": isActive,
                })}
              />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {/* Tooltip when collapsed */}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 rounded-md text-xs font-medium bg-foreground text-background opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}

        {/* Projects Section */}
        {!sidebarCollapsed && (
          <div className="pt-4">
            <button
              onClick={() => setProjectsOpen(!projectsOpen)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground transition-colors"
            >
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform",
                  !projectsOpen && "-rotate-90"
                )}
              />
              Projects
            </button>
            <AnimatePresence>
              {projectsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-0.5 overflow-hidden"
                >
                  {projects.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground italic">No projects found</div>
                  ) : projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/inbox?projectId=${project.id}`}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:text-foreground hover:bg-sidebar-hover transition-colors"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: project.color || "#8B5CF6" }}
                      />
                      {project.name}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Smart Lists */}
        {!sidebarCollapsed && (
          <div className="pt-4">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Smart Lists
            </div>
            {[
              { name: "All P0 Tasks", icon: Sparkles, count: p0Count, filter: "0" },
            ].map((list) => (
              <Link
                key={list.name}
                href={`/inbox?priority=${list.filter}`}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm text-sidebar-foreground hover:text-foreground hover:bg-sidebar-hover transition-colors"
              >
                <list.icon className="w-4 h-4" />
                <span className="flex-1">{list.name}</span>
                <span className="text-xs text-muted-foreground bg-surface px-1.5 py-0.5 rounded-full">
                  {list.count}
                </span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          
          if (item.href === "#notifications") {
            return (
              <button
                key={item.href}
                onClick={toggleNotificationsPanel}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left",
                  sidebarCollapsed
                    ? "w-10 h-10 justify-center mx-auto"
                    : "px-3 py-2",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-hover"
                )}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
                sidebarCollapsed
                  ? "w-10 h-10 justify-center mx-auto"
                  : "px-3 py-2",
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-hover"
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Bottom Actions */}
        <div className="pt-4 mt-4 border-t border-border">
          <div className={cn("flex justify-center mb-4 min-h-[32px]", sidebarCollapsed ? "px-0" : "px-3 justify-start")}>
            <div className="scale-110">
              <UserButton />
            </div>
            {!sidebarCollapsed && <span className="ml-3 text-sm font-medium text-foreground self-center">Profile</span>}
          </div>

          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground",
              "hover:text-foreground hover:bg-sidebar-hover transition-all duration-150",
              sidebarCollapsed
                ? "w-10 h-10 justify-center mx-auto"
                : "w-full px-3 py-2"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="w-[18px] h-[18px]" />
            ) : (
              <>
                <ChevronsLeft className="w-[18px] h-[18px]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* App Content */}
      <CreateWorkspaceModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </motion.aside>
  );
}
