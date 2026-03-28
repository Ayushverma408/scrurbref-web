"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import OnboardingCard from "./OnboardingCard";
import EmptyState from "./EmptyState";
import ChatView from "./ChatView";

export default function DashboardShell() {
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  const initialQuestion = searchParams.get("q") ?? undefined;

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

  // Also resolve immediately when threadId appears (e.g. URL changed to include thread).
  useEffect(() => {
    if (threadId && onboardingDone === null) {
      setOnboardingDone(true);
    }
  }, [threadId, onboardingDone]);

  if (onboardingDone === null) {
    // Tiny pause while reading cached session — render nothing to avoid flash.
    return null;
  }

  if (!onboardingDone) {
    return <OnboardingCard onComplete={() => setOnboardingDone(true)} />;
  }

  if (threadId) {
    return <ChatView threadId={threadId} initialQuestion={initialQuestion} />;
  }

  return <EmptyState />;
}
