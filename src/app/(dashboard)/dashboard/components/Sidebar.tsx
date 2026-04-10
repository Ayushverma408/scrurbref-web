"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HIGH_YIELD_THIS_WEEK, WEEK_LABEL } from "@/lib/highYield";
import SettingsModal from "./SettingsModal";
import { createClient } from "@/lib/supabase/client";
import { useThread } from "./ThreadContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Thread {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface Usage {
  daily:   { used: number; limit: number; reset: string };
  monthly: { used: number; limit: number; reset: string };
}

interface SidebarProps {
  userEmail: string;
  threads: Thread[];
  usage?: Usage | null;
  onCloseMobile?: () => void;
}

const s = {
  bg:     "var(--sidebar-bg)",
  border: "var(--sidebar-border)",
  text:   "var(--sidebar-text)",
  muted:  "var(--sidebar-muted)",
};

export default function Sidebar({ userEmail, threads, usage, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydeOpen, setHydeOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  const { setActiveThreadId, setIsNavigating } = useThread();

  async function createThread(question?: string) {
    if (creating) return;
    setCreating(true);

    // Generate ID client-side so we can navigate immediately — zero delay on click.
    // The API call happens in the background; query.ts upserts the thread on first message
    // as a safety net in case the user types before the POST completes.
    const threadId = crypto.randomUUID();
    const url = question
      ? `/dashboard?thread=${threadId}&q=${encodeURIComponent(question)}`
      : `/dashboard?thread=${threadId}`;

    onCloseMobile?.();
    setIsNavigating(true);
    setActiveThreadId(threadId); // immediately show blank chat — no router wait
    setCreating(false);
    window.history.pushState(null, '', url); // update URL bar without Next.js navigation/Suspense

    // Create thread in background — no await, no blocking the UI
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    fetch(`${API_URL}/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id: threadId }),
    }).then(() => router.refresh()); // refresh sidebar after thread is created
  }

  function handleNewConversation() {
    createThread();
  }

  const pinned = threads.filter((t) => (t as any).pinned);
  // Exclude abandoned "New conversation" threads (created but no message ever sent)
  const recent = threads.filter((t) => !(t as any).pinned && t.title && t.title !== "New conversation");

  return (
    <>
      <aside
        className="w-64 shrink-0 flex flex-col h-full"
        style={{ backgroundColor: s.bg, borderRight: `1px solid ${s.border}` }}
      >
        {/* Logo */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${s.border}` }}>
          <div className="flex items-center gap-2">
            <img src="/logo-192.png" alt="ScrubRef" className="w-6 h-6 rounded-full" />
            <span className="font-serif text-xl font-semibold tracking-tight" style={{ color: s.text }}>
              ScrubRef
            </span>
            <span
              className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: s.border, color: s.muted }}
            >
              beta
            </span>
          </div>
          {/* Close button — mobile only */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden text-xl leading-none transition-colors"
              style={{ color: s.muted }}
              aria-label="Close menu"
            >
              ×
            </button>
          )}
        </div>

        {/* New conversation */}
        <div className="px-3 pt-3 pb-2">
          <button
            onClick={handleNewConversation}
            disabled={creating}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-serif transition-colors disabled:cursor-not-allowed"
            style={{ backgroundColor: s.border, color: s.text }}
            onMouseOver={(e) => { if (!creating) e.currentTarget.style.backgroundColor = "#5a3d28"; }}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = s.border)}
          >
            {creating ? (
              <>
                <span className="text-base leading-none animate-spin inline-block">⟳</span>
                Opening…
              </>
            ) : (
              <>
                <span className="text-base leading-none">+</span>
                New conversation
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Suggested topics */}
          <div className="px-3 pt-3 pb-1">
            <button
              onClick={() => setHydeOpen((o) => !o)}
              className="w-full flex items-center justify-between px-2 py-1 text-xs font-serif font-semibold uppercase tracking-widest transition-colors"
              style={{ color: s.muted }}
            >
              <span>📌 Suggested topics</span>
              <span className="text-xs">{hydeOpen ? "▾" : "▸"}</span>
            </button>

            {hydeOpen && (
              <ul className="mt-1 space-y-0.5">
                {HIGH_YIELD_THIS_WEEK.map((topic) => (
                  <li key={topic.title}>
                    <button
                      onClick={() => createThread(topic.title)}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-serif leading-snug transition-colors"
                      style={{ color: s.muted }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = s.border;
                        e.currentTarget.style.color = s.text;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = s.muted;
                      }}
                    >
                      <span
                        className="inline-block text-xs px-1 rounded mr-1"
                        style={{ backgroundColor: s.border, color: s.muted }}
                      >
                        {topic.tag}
                      </span>
                      {topic.title}
                    </button>
                  </li>
                ))}
                <li className="px-2 pt-0.5 pb-1">
                  <span className="text-xs font-serif" style={{ color: "var(--sidebar-muted)", opacity: 0.5 }}>
                    {WEEK_LABEL}
                  </span>
                </li>
              </ul>
            )}
          </div>

          {/* Divider */}
          <div className="mx-3 my-2" style={{ borderTop: `1px solid ${s.border}` }} />

          {/* Pinned threads */}
          {pinned.length > 0 && (
            <div className="px-3 pb-1">
              <p className="px-2 py-1 text-xs font-serif uppercase tracking-widest font-semibold" style={{ color: s.muted }}>
                ⭐ Pinned
              </p>
              <ul className="space-y-0.5">
                {pinned.map((thread) => (
                  <ThreadItem key={thread.id} thread={thread} active={pathname.includes(thread.id)} onNavigate={() => setIsNavigating(true)} />
                ))}
              </ul>
              <div className="mx-0 my-2" style={{ borderTop: `1px solid ${s.border}` }} />
            </div>
          )}

          {/* Recent threads */}
          <div className="px-3 pb-2">
            <p className="px-2 py-1 text-xs font-serif uppercase tracking-widest font-semibold" style={{ color: s.muted }}>
              Recent lookups
            </p>
            {recent.length === 0 ? (
              <div className="px-2 py-4 flex flex-col items-center gap-2 text-center">
                <span className="text-2xl opacity-40">📚</span>
                <p className="text-xs font-serif leading-relaxed" style={{ color: s.muted }}>
                  Your recent lookups<br />will appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {recent.map((thread) => (
                  <ThreadItem key={thread.id} thread={thread} active={pathname.includes(thread.id)} onClose={onCloseMobile} onNavigate={() => setIsNavigating(true)} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer — settings gear */}
        <div
          className="px-4 py-3 flex flex-col gap-1.5"
          style={{ borderTop: `1px solid ${s.border}` }}
        >
          {/* Quota label — shown only when ≥80% monthly used */}
          {usage && usage.monthly.used >= Math.floor(usage.monthly.limit * 0.8) && (
            <p
              className="text-xs font-serif"
              style={{ color: usage.monthly.used >= Math.ceil(usage.monthly.limit * 0.95) ? "var(--accent)" : s.muted }}
            >
              {usage.monthly.used}/{usage.monthly.limit} messages — resets {new Date(usage.monthly.reset).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          )}
          <div className="flex items-center justify-between">
          <p className="text-xs font-serif truncate max-w-[160px]" style={{ color: s.muted }}>
            {userEmail}
          </p>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className="text-lg leading-none transition-colors"
            style={{ color: s.muted }}
            onMouseOver={(e) => (e.currentTarget.style.color = s.text)}
            onMouseOut={(e) => (e.currentTarget.style.color = s.muted)}
          >
            ⚙︎
          </button>
          </div>
        </div>
      </aside>

      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          userEmail={userEmail}
        />
      )}
    </>
  );
}

function ThreadItem({ thread, active, onClose, onNavigate }: { thread: Thread; active: boolean; onClose?: () => void; onNavigate?: () => void }) {
  return (
    <li>
      <Link
        href={`/dashboard?thread=${thread.id}`}
        onClick={() => { onNavigate?.(); onClose?.(); }}
        className="block px-2 py-1.5 rounded-lg text-xs font-serif truncate transition-colors"
        style={{
          backgroundColor: active ? "var(--sidebar-border)" : "transparent",
          color: active ? "var(--sidebar-text)" : "var(--sidebar-muted)",
        }}
      >
        {thread.title ?? "Untitled lookup"}
      </Link>
    </li>
  );
}
