"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    wakeUpTime: "07:00",
    productivityGoals: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/user/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-surface border border-border p-8 rounded-3xl shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Welcome to LifeOS</h1>
        <p className="text-muted-foreground mb-6">Let's personalize your productivity system.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 transition-colors text-white font-semibold py-3 rounded-xl disabled:opacity-50">
            {loading ? "Optimizing Database..." : "Enter LifeOS"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
