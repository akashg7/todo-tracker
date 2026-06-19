"use client";

import PusherClient from "pusher-js";

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "";

let pusherInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (typeof window === "undefined") return null;
  if (!pusherInstance && pusherKey) {
    // Determine the constructor properly in case of SSR weirdness
    const PusherConstr = (PusherClient as any).default || PusherClient;
    pusherInstance = new PusherConstr(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherInstance;
};

// Exporting a proxy/getter is safer for avoiding instant runtime evaluation crashes
export const pusher = new Proxy({} as any, {
  get: (target, prop) => {
    const client = getPusherClient();
    if (!client) {
      // Safe fallback for SSR or missing keys
      return () => ({ bind: () => {}, unbind: () => {} });
    }
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  }
});
