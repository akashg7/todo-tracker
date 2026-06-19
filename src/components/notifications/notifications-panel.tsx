"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Check, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  actionUrl: string | null;
}

export function NotificationsPanel() {
  const { notificationsPanelOpen, toggleNotificationsPanel } = useAppStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const wsFilter = activeWorkspaceId ? `?workspaceId=${activeWorkspaceId}` : "";
      const res = await fetch(`/api/notifications${wsFilter}`);
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (notificationsPanelOpen) {
      fetchNotifications();
    }
  }, [notificationsPanelOpen, activeWorkspaceId]);

  const markAllRead = async () => {
    try {
      await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          markAllRead: true,
          workspaceId: activeWorkspaceId
        }),
      });
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, workspaceId: activeWorkspaceId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AnimatePresence>
      {notificationsPanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleNotificationsPanel}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[400px] shadow-2xl border-l border-border bg-background z-50 flex flex-col pt-16 sm:pt-0"
          >
            <div className="h-14 sm:h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-semibold">
                <Bell className="w-4 h-4 text-primary" />
                <span>Notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline px-2 py-1 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
                <button onClick={toggleNotificationsPanel} className="p-2 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              {loading && notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary/50" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">You&apos;re caught up!</h3>
                  <p className="text-sm">No new notifications in this workspace.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "p-4 transition-colors hover:bg-surface relative group",
                        !notif.readAt ? "bg-primary/5" : "opacity-75"
                      )}
                    >
                      {!notif.readAt && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-md" />
                      )}
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-primary mt-1">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="font-semibold text-sm line-clamp-1">{notif.title}</h4>
                            <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
                              {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                            {notif.body}
                          </p>
                          
                          <div className="flex items-center justify-between mt-3">
                            {notif.actionUrl ? (
                              <Link 
                                href={notif.actionUrl}
                                onClick={(e) => {
                                  toggleNotificationsPanel();
                                  if (!notif.readAt) markRead(notif.id);
                                }}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                View details →
                              </Link>
                            ) : <div />}

                            {!notif.readAt && (
                              <button
                                onClick={() => markRead(notif.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-wider font-semibold bg-surface px-2 py-1 rounded-sm"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}