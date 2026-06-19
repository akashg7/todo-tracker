"use client";

import { SignIn } from "@clerk/nextjs";
import { LayoutTemplate } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <div className="w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center mb-6 mx-auto">
          <LayoutTemplate className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-2">LifeOS</h1>
        <p className="text-muted-foreground">Your premium productivity ecosystem.</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <SignIn 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-accent hover:bg-accent/90 text-sm normal-case rounded-xl h-11',
              card: 'bg-surface border border-border shadow-2xl rounded-[2rem] overflow-hidden',
              headerTitle: 'text-foreground font-bold',
              headerSubtitle: 'text-muted-foreground',
              socialButtonsBlockButton: 'bg-background border border-border hover:bg-surface-hover rounded-xl',
              socialButtonsBlockButtonText: 'text-foreground font-medium',
              dividerLine: 'bg-border',
              dividerText: 'text-muted-foreground',
              formFieldLabel: 'text-foreground font-semibold',
              formFieldInput: 'bg-background border border-border focus:border-accent/40 rounded-xl transition-all',
              footerActionLink: 'text-accent hover:text-accent/80',
              identityPreviewText: 'text-foreground',
              identityPreviewEditButtonIcon: 'text-accent',
            }
          }}
          routing="path" 
          path="/login" 
          signUpUrl="/sign-up"
        />
      </motion.div>
    </div>
  );
}
