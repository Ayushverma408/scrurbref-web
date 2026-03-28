"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const DEPTH_OPTIONS = [
  { id: "concise",       icon: "🎯", label: "Precise" },
  { id: "balanced",      icon: "⚖️", label: "Balanced" },
  { id: "comprehensive", icon: "📖", label: "Full depth" },
];

const TONE_OPTIONS = [
  { id: "textbook", icon: "📚", label: "Textbook" },
  { id: "teaching", icon: "🗣️", label: "Teaching" },
];

const RESTRICTIVENESS_OPTIONS = [
  { id: "strict",  icon: "🔒", label: "By the book" },
  { id: "guided",  icon: "🔀", label: "Guided" },
  { id: "open",    icon: "🧠", label: "Full knowledge" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface SettingsModalProps {
  onClose: () => void;
  userEmail: string;
}

export default function SettingsModal({ onClose, userEmail }: SettingsModalProps) {
  const [profilePrompt, setProfilePrompt] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [trainingYear, setTrainingYear] = useState("");
  const [depth, setDepth] = useState("");
  const [tone, setTone] = useState("");
  const [restrictiveness, setRestrictiveness] = useState("guided");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<{ daily: { used: number; limit: number } } | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata ?? {};
      setProfilePrompt(meta.profile_prompt ?? "");
      setSpecialty(meta.specialty ?? "");
      setTrainingYear(meta.training_year ?? "");
      setDepth(meta.answer_depth ?? "");
      setTone(meta.answer_tone ?? "");
      setRestrictiveness(meta.answer_restrictiveness ?? "guided");

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch(`${API_URL}/query/usage`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) setUsage(await res.json());
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: {
        profile_prompt: profilePrompt,
        specialty,
        training_year: trainingYear,
        answer_depth: depth,
        answer_tone: tone,
        answer_restrictiveness: restrictiveness,
      },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div
        className="fixed z-50 shadow-xl overflow-y-auto rounded-2xl p-5
          inset-x-3 bottom-3 top-16
          md:inset-auto md:bottom-16 md:left-4 md:w-[21rem] md:max-h-[calc(100vh-5rem)]"
        style={{
          backgroundColor: "var(--papyrus-light)",
          border: "1px solid var(--papyrus-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-semibold text-ink text-base">Settings</h3>
          <button onClick={onClose} className="text-ink-faint hover:text-ink text-xl leading-none">×</button>
        </div>

        {/* Subscription */}
        <div
          className="rounded-lg px-3 py-2 mb-4 text-xs font-serif"
          style={{ backgroundColor: "var(--papyrus)", border: "1px solid var(--papyrus-border)" }}
        >
          <span className="text-ink-muted">Plan: </span>
          <span className="font-semibold text-ink">Beta — free access</span>
          <br />
          <span className="text-ink-faint">Paid subscription begins after June 2026.</span>
        </div>

        {/* Usage */}
        <div className="mb-4 text-xs font-serif text-ink-muted">
          Queries today:{" "}
          <span className="font-semibold text-ink">{usage?.daily.used ?? "…"}</span>
          <span className="text-ink-faint"> / {usage?.daily.limit ?? "…"}</span>
        </div>

        {/* Answer depth */}
        <p className="text-xs font-serif font-medium text-ink mb-1">Answer depth</p>
        <div className="flex gap-2 mb-4">
          {DEPTH_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDepth(opt.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-serif transition-all"
              style={{
                backgroundColor: depth === opt.id ? "var(--ink)" : "var(--papyrus)",
                border: `1.5px solid ${depth === opt.id ? "var(--ink)" : "var(--papyrus-border)"}`,
                color: depth === opt.id ? "var(--papyrus)" : "var(--ink-muted)",
              }}
            >
              <span>{opt.icon}</span>
              <span className="font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Answer tone */}
        <p className="text-xs font-serif font-medium text-ink mb-1">Answer tone</p>
        <div className="flex gap-2 mb-4">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTone(opt.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-serif transition-all"
              style={{
                backgroundColor: tone === opt.id ? "var(--ink)" : "var(--papyrus)",
                border: `1.5px solid ${tone === opt.id ? "var(--ink)" : "var(--papyrus-border)"}`,
                color: tone === opt.id ? "var(--papyrus)" : "var(--ink-muted)",
              }}
            >
              <span>{opt.icon}</span>
              <span className="font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Knowledge source / restrictiveness */}
        <p className="text-xs font-serif font-medium text-ink mb-1">Knowledge source</p>
        <div className="flex gap-2 mb-4">
          {RESTRICTIVENESS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setRestrictiveness(opt.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-serif transition-all"
              style={{
                backgroundColor: restrictiveness === opt.id ? "var(--ink)" : "var(--papyrus)",
                border: `1.5px solid ${restrictiveness === opt.id ? "var(--ink)" : "var(--papyrus-border)"}`,
                color: restrictiveness === opt.id ? "var(--papyrus)" : "var(--ink-muted)",
              }}
            >
              <span>{opt.icon}</span>
              <span className="font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Profile prompt */}
        <p className="text-xs font-serif font-medium text-ink mb-1">Your profile context</p>
        <p className="text-xs font-serif text-ink-faint mb-2">
          Sent with every question. Edit freely.
        </p>
        <textarea
          value={profilePrompt}
          onChange={(e) => setProfilePrompt(e.target.value)}
          rows={5}
          placeholder="e.g. I am a JR2 in MS General Surgery preparing for NEET-SS…"
          className="w-full px-3 py-2 rounded-lg text-xs font-serif text-ink leading-relaxed outline-none resize-none mb-1"
          style={{
            backgroundColor: "var(--papyrus)",
            border: "1px solid var(--papyrus-border)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink-muted)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--papyrus-border)")}
        />
        {specialty && trainingYear && (
          <p className="text-xs font-serif text-ink-faint mb-3">
            {trainingYear} · {specialty}
          </p>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2 rounded-lg text-sm font-serif font-medium transition-colors disabled:opacity-50 mb-3"
          style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
        </button>

        <div className="text-xs font-serif text-ink-faint truncate mb-2">{userEmail}</div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-xs font-serif text-ink-muted hover:text-accent transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
