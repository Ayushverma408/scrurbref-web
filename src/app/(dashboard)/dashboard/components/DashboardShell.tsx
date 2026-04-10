"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OnboardingCard from "./OnboardingCard";
import EmptyState from "./EmptyState";
import ChatView from "./ChatView";
import { useThread } from "./ThreadContext";

export default function DashboardShell() {
  const searchParams = useSearchParams();
  const urlThreadId = searchParams.get("thread");
  const initialQuestion = searchParams.get("q") ?? undefined;
  const initialMode = (searchParams.get("mode") ?? undefined) as import("./MessageBubble").MessageMode | undefined;

  const { activeThreadId, setActiveThreadId, isNavigating, setIsNavigating } = useThread();

  // Prefer context (set instantly on click) over URL (set after router round-trip)
  const threadId = activeThreadId ?? urlThreadId;

  // When Next.js Link navigation changes the URL, trust the URL over context
  useEffect(() => {
    if (urlThreadId) {
      setActiveThreadId(null);
    }
  }, [urlThreadId, setActiveThreadId]);

  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(
    // If there's a threadId, user must have completed onboarding — skip the check.
    threadId ? true : null
  );

  useEffect(() => {
    // Already resolved — don't re-run.
    if (onboardingDone !== null) return;

    // getSession() reads the cached session from localStorage — no network call.
    createClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        const hasProfile = !!session?.user?.user_metadata?.profile_prompt;
        setOnboardingDone(hasProfile);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let content: React.ReactNode;
  if (threadId) {
    // key={threadId} forces remount on every thread switch so ChatView clears the spinner on mount
    content = <ChatView key={threadId} threadId={threadId} initialQuestion={initialQuestion} initialMode={initialMode} />;
  } else if (onboardingDone === null) {
    content = null;
  } else if (!onboardingDone) {
    content = <OnboardingCard onComplete={() => setOnboardingDone(true)} />;
  } else {
    content = <EmptyState />;
  }

  return (
    <div className="relative h-full flex flex-col flex-1">
      {content}
      {isNavigating && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ backgroundColor: "var(--color-papyrus, #fdf6e3)" }}>
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
          <span className="text-xs font-serif opacity-40">Opening…</span>
        </div>
      )}
    </div>
  );
}
