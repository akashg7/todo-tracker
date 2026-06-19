"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskPanel } from "@/components/tasks/task-panel";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { useAppStore } from "@/stores/app-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useWorkspaceChannel } from "@/hooks/use-workspace-channel";
import { motion } from "framer-motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSelectedTaskId } = useAppStore();
  const { activeWorkspaceId } = useWorkspaceStore();

  useWorkspaceChannel(activeWorkspaceId);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <CommandPalette />
      <QuickAdd />
      <TaskPanel />
      <NotificationsPanel />

      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="min-h-screen pb-20 md:pb-0"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </motion.main>

      <MobileNav />
    </div>
  );
}
