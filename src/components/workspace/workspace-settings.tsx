"use client";

import { useEffect, useState } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Link, Copy, Check, UserPlus, Shield, User as UserIcon, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  user: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
  };
}

export function WorkspaceSettings() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { user } = useUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const currentUserMember = members.find((m) => m.user.id === user?.id || m.user.email === user?.primaryEmailAddress?.emailAddress);
  const isOwner = currentUserMember?.role === "OWNER";

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`);
        if (res.ok) {
          setMembers(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [activeWorkspaceId]);

  const generateInvite = async () => {
    if (!activeWorkspaceId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MEMBER", maxUses: 5 })
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/invite/${data.token}`;
        setInviteLink(link);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const updateRole = async (userId: string, newRole: string) => {
    if (!activeWorkspaceId) return;
    setUpdatingRole(userId);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setMembers((prev) => prev.map(m => m.user.id === userId ? { ...m, role: newRole as any } : m));
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update role");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingRole(null);
    }
  };

  const copyToClipboard = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeWorkspaceId) {
    return (
      <div className="p-6 bg-surface border border-border rounded-xl text-center">
        <h3 className="text-lg font-medium mb-2">No Workspace Selected</h3>
        <p className="text-sm text-muted-foreground">Select a workspace from the sidebar to manage its settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-accent" />
          Invite Members
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Generate an invite link to collaborate with others in this workspace. 
          Invited members will be able to view and assign tasks.
        </p>

        {!inviteLink ? (
          <button
            onClick={generateInvite}
            disabled={generating}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "Generating..." : "Generate Invite Link"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
              <Link className="w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                readOnly 
                value={inviteLink}
                className="bg-transparent border-none outline-none flex-1 text-sm text-foreground"
              />
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-accent" />
            Workspace Members
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            People who have access to this workspace.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading members...</div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 px-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  {member.user.avatar ? (
                    <img src={member.user.avatar} alt={member.user.name} className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/20 text-accent flex items-center justify-center font-medium">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {isOwner && member.user.id !== user?.id ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateRole(member.user.id, e.target.value)}
                      disabled={updatingRole === member.user.id}
                      className="px-2.5 py-1 rounded-md bg-secondary text-xs font-medium text-secondary-foreground border border-border cursor-pointer outline-none focus:ring-2 focus:ring-accent/50"
                    >
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <div className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium text-secondary-foreground flex items-center gap-1.5">
                      {member.role === "OWNER" && <Shield className="w-3 h-3 text-accent" />}
                      {member.role}
                    </div>
                  )}

                  {isOwner && member.role !== "OWNER" && (
                    <button className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
