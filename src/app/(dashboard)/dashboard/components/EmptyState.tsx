"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { type MessageMode } from "./MessageBubble";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const MODE_CARDS: { key: MessageMode; label: string; icon: string; desc: string }[] = [
  {
    key:   "standard",
    label: "Answer",
    icon:  "📖",
    desc:  "Cited answers from 4 surgical textbooks",
  },
  {
    key:   "viva",
    label: "Viva",
    icon:  "🎯",
    desc:  "Structured exam-style answer with follow-up",
  },
  {
    key:   "quiz",
    label: "Quiz",
    icon:  "🧠",
    desc:  "5 MCQs sourced from textbooks with citations",
  },
];

const EXAMPLES: Record<MessageMode, string[]> = {
  standard: [
    "Steps of a Whipple for pancreatic head cancer",
    "Anatomical basis of posterior adrenalectomy",
    "Management of CBD injury found intraoperatively",
    "Blood supply to the oesophagus and implications for oesophagectomy",
    "Layers of the anterior abdominal wall",
    "Indications for damage control laparotomy",
  ],
  viva: [
    "Anatomical basis of cholecystectomy",
    "Layers encountered during inguinal hernia repair",
    "Blood supply of the stomach in oesophagectomy",
    "Relations of the common bile duct",
    "Surgical anatomy of the portal triad",
    "Define Pringle manoeuvre and its basis",
  ],
  quiz: [
    "Hepatic anatomy",
    "Portal hypertension",
    "Pancreatic head resection",
    "Bile duct anatomy",
    "Abdominal wall hernias",
    "Colorectal anatomy",
  ],
};

export default function EmptyState() {
  const router = useRouter();
  const [mode, setMode] = useState<MessageMode>("standard");

  async function startThread(question?: string) {
    const threadId = crypto.randomUUID();
    const params = new URLSearchParams({ thread: threadId });
    if (question) params.set("q", question);
    if (mode !== "standard") params.set("mode", mode);

    router.push(`/dashboard?${params.toString()}`);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`${API_URL}/threads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id: threadId }),
    });
    router.refresh();
  }

  const examples = EXAMPLES[mode];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center select-none">
      <p className="font-serif text-2xl font-semibold text-ink mb-6">What do you want to look up?</p>

      {/* Mode cards */}
      <div className="w-full max-w-xl grid grid-cols-3 gap-3 mb-8">
        {MODE_CARDS.map((card) => (
          <button
            key={card.key}
            onClick={() => setMode(card.key)}
            className="flex flex-col gap-1.5 px-4 py-4 rounded-xl text-left transition-all"
            style={{
              backgroundColor: mode === card.key ? "var(--papyrus)" : "var(--papyrus-light)",
              border: `${mode === card.key ? "2px" : "1px"} solid ${mode === card.key ? "var(--accent)" : "var(--papyrus-border)"}`,
              boxShadow: mode === card.key ? "0 1px 8px rgba(139,90,43,0.15)" : "none",
            }}
          >
            <span className="text-xl">{card.icon}</span>
            <span className="font-serif text-sm font-semibold text-ink">{card.label}</span>
            <span className="font-serif text-xs text-ink-muted leading-snug">{card.desc}</span>
          </button>
        ))}
      </div>

      {/* Example questions/topics */}
      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
        {examples.map((q) => (
          <button
            key={q}
            onClick={() => startThread(q)}
            className="text-left px-4 py-3 rounded-xl font-serif text-sm text-ink-muted transition-colors hover:text-ink"
            style={{
              backgroundColor: "var(--papyrus-light)",
              border: "1px solid var(--papyrus-border)",
            }}
          >
            {mode === "quiz" ? `Quiz: ${q}` : q}
          </button>
        ))}
      </div>

      <p className="font-serif text-xs text-ink-faint mt-8">
        Fischer · Sabiston · Shackelford · Blumgart
      </p>
    </div>
  );
}
