import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="p-8 bg-surface rounded-[2rem] shadow-2xl border border-border">
        <SignUp />
      </div>
    </div>
  );
}
