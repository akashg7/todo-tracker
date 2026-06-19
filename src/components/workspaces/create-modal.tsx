"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Plus, X, Upload, Palette } from "lucide-react";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function CreateWorkspaceModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#7F77DD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { workspaces, setWorkspaces, setActiveWorkspace } = useWorkspaceStore();

  const colors = ["#7F77DD", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#EC4899", "#8B5CF6"];

  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setColor("#7F77DD");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      });

      if (res.ok) {
        const newWorkspace = await res.json();
        setWorkspaces([newWorkspace, ...workspaces]);
        setActiveWorkspace(newWorkspace.id);
        onClose();
        window.dispatchEvent(new Event("app-data-changed"));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Create Workspace</h2>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Workspace Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Design Team, Family, Personal"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-background border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-lg px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground text-foreground"
                    />
                  </div>

                  {/* Description field */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="What is this workspace for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full bg-background border border-border focus:border-accent focus:ring-1 focus:ring-accent rounded-lg px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground resize-none text-foreground"
                    />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Theme Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-transform ring-offset-2 ring-offset-background",
                            color === c ? "scale-110 ring-2 ring-accent" : "hover:scale-110"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || isSubmitting}
                    className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium flex items-center justify-center min-w-[100px] disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      "Create Workspace"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}