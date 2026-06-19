"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, User as UserIcon, Calendar, Fullscreen, MessageSquare, UserPlus, Plus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useWorkspaceStore } from "@/stores/workspace-store";

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  dueDate: string | null;
  assignments?: Assignment[];
  workspaceId: string | null;
}

interface Assignment {
  id: string;
  assignee: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

export function TaskPanel() {
  const { selectedTaskId, setSelectedTaskId } = useAppStore();
  const { activeWorkspaceId } = useWorkspaceStore();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedTaskId) {
      setTask(null);
      setComments([]);
      return;
    }

    async function fetchTaskAndComments() {
      setLoading(true);
      try {
        if (activeWorkspaceId) {
            const mRes = await fetch(`/api/workspaces/${activeWorkspaceId}/members`);
            if (mRes.ok) {
                const mJson = await mRes.json();
                setMembers(mJson.map((m: any) => m.user));
            }
        }

        const tRes = await fetch(`/api/tasks/${selectedTaskId}`);
        if (tRes.ok) {
          const tJson = await tRes.json();
          setTask(tJson);
        }

        const cRes = await fetch(`/api/tasks/${selectedTaskId}/comments`);
        if (cRes.ok) {
          const cJson = await cRes.json();
          setComments(cJson);
        }

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchTaskAndComments();

    // Listen for realtime pushes
    const handleDataChange = () => fetchTaskAndComments();
    window.addEventListener("app-data-changed", handleDataChange);
    return () => window.removeEventListener("app-data-changed", handleDataChange);
  }, [selectedTaskId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const handleClose = () => {
    setSelectedTaskId(null);
  };


  const addAssignee = async (userId: string) => {
    if (!task) return;
    setShowAssignPicker(false);
    try {
        await fetch(`/api/tasks/${task.id}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ assigneeId: userId })
        });
        window.dispatchEvent(new Event("app-data-changed"));
    } catch(e) { console.error(e) }
  };

  const removeAssignee = async (userId: string) => {
    if (!task) return;
    try {
        await fetch(`/api/tasks/${task.id}/assign?assigneeId=${userId}`, { method: "DELETE" });
        window.dispatchEvent(new Event("app-data-changed"));
    } catch(e) { console.error(e) }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedTaskId) return;

    const tmpText = commentInput;
    setCommentInput("");

    try {
      const res = await fetch(`/api/tasks/${selectedTaskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: tmpText,
          workspaceId: activeWorkspaceId || task?.workspaceId,
        }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        window.dispatchEvent(new Event("app-data-changed")); // Just to sync other views if needed
      } else {
        setCommentInput(tmpText); // revert on faliure
      }
    } catch (er) {
      console.error(er);
      setCommentInput(tmpText);
    }
  };

  return (
    <AnimatePresence>
      {selectedTaskId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-background/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] shadow-2xl border-l border-border bg-background z-50 flex flex-col pt-16 sm:pt-0"
          >
            {/* Header */}
            <div className="h-14 sm:h-16 px-4 border-b border-border flex items-center justify-between shrink-0">
              <span className="font-semibold text-sm">Task Details</span>
              <div className="flex items-center gap-2">
                 <button onClick={handleClose} className="p-2 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                 <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : task ? (
              <>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                  {/* Task Header & Body */}
                  <div>
                    <h2 className="text-xl font-bold mb-4">{task.title}</h2>
                    <div className="flex flex-col gap-3 text-sm">
                       <div className="flex items-center gap-4 text-muted-foreground relative">
                          <div className="flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5"/> Assignee</div>
                          <div className="flex items-center gap-2">
                             {task.assignments && task.assignments.length > 0 ? (
                               <div className="flex flex-wrap gap-2">
                                 {task.assignments.map(a => (
                                    <div key={a.id} className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-full text-xs text-foreground cursor-pointer hover:bg-red-500/20 hover:text-red-500 transition-colors" title="Click to remove" onClick={() => removeAssignee(a.assignee?.id || "")}>
                                      <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center font-bold overflow-hidden">
                                        {a.assignee?.avatar ? <img src={a.assignee.avatar} alt="avatar" /> : a.assignee?.name?.[0] || <UserIcon className="w-3 h-3"/>}
                                      </div>
                                      {a.assignee?.name || "Unknown"}
                                    </div>
                                 ))}
                                 <button onClick={() => setShowAssignPicker(!showAssignPicker)} className="w-6 h-6 rounded-full bg-surface border border-dashed border-border flex items-center justify-center hover:border-primary shrink-0"><Plus className="w-3 h-3"/></button>
                               </div>
                             ) : (
                               <button 
                                 onClick={() => setShowAssignPicker(!showAssignPicker)}
                                 className="text-xs border border-dashed border-border px-3 py-1 rounded-lg hover:border-primary transition-colors text-foreground"
                               >
                                 Unassigned
                               </button>
                             )}
                             
                             {showAssignPicker && members.length > 0 && (
                               <div className="absolute left-24 top-8 w-48 bg-background border border-border shadow-xl rounded-xl py-1 z-10 select-none">
                                  <div className="px-3 py-2 text-xs font-semibold border-b border-border text-muted-foreground">Select Member</div>
                                  <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                  {members.map(m => (
                                     <button 
                                       key={m.id}
                                       disabled={task.assignments?.some(a => a.assignee?.id === m.id)}
                                       onClick={() => addAssignee(m.id)}
                                       className="flex items-center gap-2 w-full px-2 py-2 text-left hover:bg-surface rounded-lg text-sm disabled:opacity-30 disabled:cursor-not-allowed text-foreground"
                                     >
                                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                                           {m.avatar ? <img src={m.avatar} alt="avatar" /> : m.name[0]}
                                        </div>
                                        <span className="truncate">{m.name}</span>
                                     </button>
                                  ))}
                                  </div>
                               </div>
                             )}
                          </div>
                       </div>
                                              <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5"><Fullscreen className="w-3.5 h-3.5"/> Status</div>
                          <div className="capitalize text-foreground font-medium bg-surface px-2 py-0.5 rounded-full text-xs">
                             {task.status.replace("_", " ")}
                          </div>
                       </div>
                       <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Due Date</div>
                          <div className="text-foreground">
                             {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No Date"}
                          </div>
                       </div>
                    </div>

                    <div className="mt-8 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {task.description || <span className="text-muted-foreground italic">No description provided.</span>}
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="border-t border-border pt-6">
                      <h3 className="font-semibold flex items-center gap-2 text-sm mb-4"><MessageSquare className="w-4 h-4 text-muted-foreground" /> Comments</h3>
                    
                    {comments.length === 0 ? (
                      <p className="text-xs text-muted-foreground mb-6 text-center py-4 bg-surface rounded-xl">No comments yet. Start the conversation!</p>
                    ) : (
                      <div className="space-y-4 mb-6">
                        {comments.map((c) => (
                          <div key={c.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {c.author?.name ? c.author.name[0] : <UserIcon className="w-4 h-4"/>}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-semibold text-xs text-foreground">{c.author?.name || "Unknown User"}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/90 bg-surface px-3 py-2 rounded-xl rounded-tl-none">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment Input */}
                <div className="p-4 border-t border-border bg-background">
                  <form onSubmit={handlePostComment} className="flex items-center gap-2 bg-surface p-1.5 rounded-full pr-2">
                    <input 
                      type="text"
                      className="flex-1 bg-transparent px-4 text-sm focus:outline-none placeholder:text-muted-foreground/50"
                      placeholder="Comment or mention someone..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                    />
                    <button 
                      type="submit" 
                      disabled={!commentInput.trim()}
                      className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Task not found
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}