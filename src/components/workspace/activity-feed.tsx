"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Activity, UserPlus, MessageSquare, CheckCircle2, Edit3, Trash2, PlusCircle, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: string;
  entityId: string;
  entityType: string;
  payload: string;
  createdAt: string;
  actorId: string;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "TASK_CREATED":
      return <PlusCircle className="w-4 h-4 text-green-500" />;
    case "TASK_COMPLETED":
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "TASK_ASSIGNED":
    case "TASK_UNASSIGNED":
    case "MEMBER_JOINED":
      return <UserPlus className="w-4 h-4 text-blue-500" />;
    case "TASK_COMMENTED":
      return <MessageSquare className="w-4 h-4 text-purple-500" />;
    case "TASK_UPDATED":
      return <Edit3 className="w-4 h-4 text-amber-500" />;
    case "TASK_DELETED":
      return <Trash2 className="w-4 h-4 text-red-500" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
};

const getActivityText = (type: string, payload: any) => {
  const data = typeof payload === "string" ? JSON.parse(payload) : payload;
  switch (type) {
    case "TASK_CREATED":
      return <span>created task <span className="font-medium text-foreground">{data.title || "Untitled"}</span></span>;
    case "TASK_COMPLETED":
      return <span>completed a task</span>;
    case "TASK_ASSIGNED":
      return <span>assigned someone to a task</span>;
    case "TASK_UNASSIGNED":
      return <span>removed an assignee from a task</span>;
    case "TASK_COMMENTED":
      return <span>commented: "{data.content ? data.content.substring(0, 30) + "..." : "..."}"</span>;
    case "MEMBER_JOINED":
      return <span>joined the workspace</span>;
    default:
      return <span>performed an action</span>;
  }
};

export function ActivityFeed() {
  const { activeWorkspaceId } = useWorkspaceStore();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/workspaces/${activeWorkspaceId}/activity`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [activeWorkspaceId]);

  if (!activeWorkspaceId) return null;

  return (
    <div className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden h-full max-h-[600px]">
      <div className="p-4 border-b border-border flex items-center justify-between bg-surface/50">
        <h3 className="font-medium flex items-center gap-2 text-foreground">
          <Activity className="w-4 h-4 text-accent" /> Workspace Activity
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <span className="text-sm text-muted-foreground animate-pulse">Loading activity...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
            <div className="w-12 h-12 bg-accent/10 text-accent rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground">Actions taken in this workspace will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, i) => (
              <motion.div 
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-3 items-start relative before:absolute before:left-3.5 before:top-8 before:bottom-[-20px] before:w-[1px] before:bg-border last:before:hidden"
              >
                <div className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center shrink-0 z-10">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-muted-foreground leading-tight">
                    <span className="font-medium text-foreground">Someone</span>{" "}
                    {getActivityText(activity.type, activity.payload)}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
