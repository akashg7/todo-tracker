import { useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useTaskStore } from "@/stores/task-store";
import { toast } from "sonner"; // If accessible, otherwise use simple alert or console.log.

export function useWorkspaceChannel(workspaceId: string | null) {
  const pusherInstance = useRef<Pusher | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    if (!pusherInstance.current) {
      const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
      const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "";
      if (pusherKey) {
        pusherInstance.current = new Pusher(pusherKey, {
          cluster: pusherCluster,
          authEndpoint: "/api/pusher/auth",
        });
      }
    }

    const pusher = pusherInstance.current;
    if (!pusher) return;

    const channel = pusher.subscribe(`private-workspace-${workspaceId}`);

    channel.bind("task:created", (data: any) => {
      useTaskStore.getState().addTask(data);
      window.dispatchEvent(new Event("app-data-changed"));
    });

    channel.bind("task:updated", (data: any) => {
      useTaskStore.getState().updateTask(data.id, data);
      window.dispatchEvent(new Event("app-data-changed"));
    });

    channel.bind("task:deleted", (id: string) => {
      useTaskStore.getState().removeTask(id);
      window.dispatchEvent(new Event("app-data-changed"));
    });

    channel.bind("task:assigned", (data: any) => {
      window.dispatchEvent(new Event("app-data-changed"));
      toast?.("Task assigned: " + data.taskId);
    });

    channel.bind("member:joined", (data: any) => {
      // update workspace store members
      window.dispatchEvent(new Event("app-data-changed"));
    });

    return () => {
      if (pusher) {
        pusher.unsubscribe(`private-workspace-${workspaceId}`);
      }
    };
  }, [workspaceId]);
}
