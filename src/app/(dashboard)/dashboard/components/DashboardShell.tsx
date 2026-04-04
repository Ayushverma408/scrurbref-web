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

  const { activeThreadId, setActiveThreadId } = useThread();

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
