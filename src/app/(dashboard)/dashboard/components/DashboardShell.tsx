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

  const { activeThreadId, setActiveThreadId, isNavigating, setIsNavigating } = useThread();

  // Prefer context (set instantly on click) over URL (set after router round-trip)
  const threadId = activeThreadId ?? urlThreadId;

  // When Next.js Link navigation changes the URL, trust the URL over context
  useEffect(() => {
    if (urlThreadId) {
      setActiveThreadId(null);
    }
  }, [urlThreadId, setActiveThreadId]);

  // Clear loading spinner once we have a thread to show
  useEffect(() => {
    if (threadId) setIsNavigating(false);
  }, [threadId, setIsNavigating]);

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

  // Show spinner immediately when any thread click was registered
  if (isNavigating && !threadId) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
          <span className="text-xs font-serif opacity-40">Opening…</span>
        </div>
      </div>
    );
  }

  // If a threadId is active, skip onboarding entirely — show chat immediately.
  if (threadId) {
    return <ChatView threadId={threadId} initialQuestion={initialQuestion} />;
  }

  if (onboardingDone === null) {
    // Tiny pause while reading cached session — render nothing to avoid flash.
    return null;
  }

  if (!onboardingDone) {
    return <OnboardingCard onComplete={() => setOnboardingDone(true)} />;
  }

  return <EmptyState />;
}
