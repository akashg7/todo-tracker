"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Palette,
  Type,
  Monitor,
  User,
  Keyboard,
  Users,
} from "lucide-react";
import { WorkspaceSettings } from "@/components/workspace/workspace-settings";
import { useUser } from "@clerk/nextjs";

const accentColors = [
  { key: "purple" as const, color: "#8B5CF6", label: "Purple" },
  { key: "blue" as const, color: "#3B82F6", label: "Blue" },
  { key: "teal" as const, color: "#14B8A6", label: "Teal" },
  { key: "coral" as const, color: "#F97316", label: "Coral" },
  { key: "amber" as const, color: "#F59E0B", label: "Amber" },
  { key: "pink" as const, color: "#EC4899", label: "Pink" },
];

const densityOptions = [
  { key: "compact" as const, label: "Compact", desc: "Maximum information density" },
  { key: "comfortable" as const, label: "Comfortable", desc: "Balanced spacing" },
  { key: "cozy" as const, label: "Cozy", desc: "Relaxed, spacious layout" },
];

const shortcuts = [
  { keys: ["⌘", "K"], action: "Command palette" },
  { keys: ["Q"], action: "Quick add task" },
  { keys: ["⌘", "B"], action: "Toggle sidebar" },
  { keys: ["⌘", "1-6"], action: "Navigate sections" },
  { keys: ["?"], action: "Show shortcuts" },
  { keys: ["Esc"], action: "Close panel / modal" },
];

export default function SettingsPage() {
  const { user } = useUser();
  const { theme, setTheme, accentColor, setAccentColor, density, setDensity, toggleSidebar } = useAppStore();

  const userName = user?.fullName || user?.username || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-accent" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your LifeOS experience</p>
      </motion.div>

      {/* Profile */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface border border-border rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-accent" />
          Profile
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/40 to-accent flex items-center justify-center text-2xl font-bold text-white">
            {userInitial}
          </div>
          <div>
            <p className="font-semibold text-foreground">{userName}</p>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>
      </motion.section>

      {/* Theme */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-surface border border-border rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Monitor className="w-4 h-4 text-accent" />
          Appearance
        </h2>

        {/* Theme Toggle */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Theme</label>
          <div className="flex gap-3 mt-2">
            {[
              { key: "dark" as const, icon: Moon, label: "Dark" },
              { key: "light" as const, icon: Sun, label: "Light" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all flex-1",
                  theme === t.key
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border-hover"
                )}
              >
                <t.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Accent Color</label>
          <div className="flex gap-3 mt-2">
            {accentColors.map((c) => (
              <button
                key={c.key}
                onClick={() => setAccentColor(c.key)}
                className={cn(
                  "w-10 h-10 rounded-xl transition-all",
                  accentColor === c.key && "ring-2 ring-offset-2 ring-offset-background scale-110"
                )}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Density */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Density</label>
          <div className="space-y-2 mt-2">
            {densityOptions.map((d) => (
              <button
                key={d.key}
                onClick={() => setDensity(d.key)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                  density === d.key
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-border-hover"
                )}
              >
                <div className="flex-1">
                  <p className={cn("text-sm font-medium", density === d.key ? "text-accent" : "text-foreground")}>
                    {d.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
                {density === d.key && (
                  <div className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Keyboard Shortcuts */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-surface border border-border rounded-2xl p-6 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-accent" />
          Keyboard Shortcuts
        </h2>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">{s.action}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-2 py-1 rounded-md border border-border bg-background text-xs font-mono text-muted-foreground min-w-[28px] text-center"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

        {/* Workspace Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-surface border border-border rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            Workspace
          </h2>
          <WorkspaceSettings />
        </motion.section>
      </div>
    );
  }
