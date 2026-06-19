"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { motion } from "framer-motion";
import { Loader2, Briefcase, CheckCircle, AlertTriangle } from "lucide-react";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const router = useRouter();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any>(null);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (res.ok) {
          const data = await res.json();
          setInviteData(data);
        } else {
          const err = await res.json();
          setError(err.error || "Failed to load invite");
        }
      } catch (err) {
        setError("Network error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (inviteData?.isAlreadyMember) {
      setActiveWorkspace(inviteData.workspace.id);
      router.push("/dashboard");
      return;
    }

    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        // Set as active workspace and redirect to dashboard
        setActiveWorkspace(data.workspaceId);
        
        // Dispatch event so sidebar and other components refresh
        window.dispatchEvent(new Event("app-data-changed"));
        
        router.push("/dashboard");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to accept invite");
        setAccepting(false);
      }
    } catch (err) {
      setError("Network error occurred");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-muted-foreground">Verifying invite...</p>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invite</h1>
        <p className="text-muted-foreground mb-8">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-accent/20 mx-auto flex items-center justify-center mb-6">
          {inviteData?.workspace?.photo ? (
            <img src={inviteData.workspace.photo} alt="Workspace" className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <Briefcase className="w-10 h-10 text-accent" />
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Join {inviteData?.workspace?.name}
        </h1>
        
        {inviteData?.isAlreadyMember ? (
          <p className="text-muted-foreground mb-8">
            You are already a member of this workspace.
          </p>
        ) : (
          <p className="text-muted-foreground mb-8">
            You have been invited to collaborate in this workspace as a <span className="font-semibold text-foreground">{inviteData?.role}</span>.
          </p>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full py-3 px-4 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {accepting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Joining...
            </>
          ) : inviteData?.isAlreadyMember ? (
            "Open Workspace"
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Accept Invite
            </>
          )}
        </button>
        
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full mt-3 py-3 px-4 bg-transparent hover:bg-white/5 text-muted-foreground rounded-xl font-medium transition-colors"
        >
          Decline
        </button>
      </motion.div>
    </div>
  );
}
