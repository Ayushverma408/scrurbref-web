"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const EXAMPLE_QUESTIONS = [
  "Steps of a Whipple for pancreatic head cancer",
  "Layers of the anterior abdominal wall and their nerve supply",
  "Anatomical basis of the posterior approach in adrenalectomy",
  "Management of common bile duct injury discovered intraoperatively",
  "Blood supply to the oesophagus and implications for oesophagectomy",
  "Indications and technique for damage control laparotomy",
];

export default function EmptyState() {
  const router = useRouter();

  async function startWithQuestion(question: string) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`${API_URL}/threads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) return;
    const thread = await res.json();
    router.push(`/dashboard?thread=${thread.id}&q=${encodeURIComponent(question)}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-10 sm:px-6 sm:py-16 text-center">
      <div className="w-full max-w-2xl">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-ink mb-2">
          What do you want to look up?
        </h1>
        <p className="font-serif text-ink-muted text-base mb-3">
          Ask anything. Answers are grounded in your textbooks with book name + page citations.
        </p>

        <p className="font-serif text-xs sm:text-sm text-ink-muted mb-8 sm:mb-10 leading-relaxed">
          Searching across:{" "}
          <strong className="text-ink">Fischer&apos;s Mastery of Surgery</strong>
          {" · "}
          <strong className="text-ink">Sabiston Textbook of Surgery</strong>
          {" · "}
          <strong className="text-ink">Shackelford&apos;s Surgery of the Alimentary Tract</strong>
          {" · "}
          <strong className="text-ink">Blumgart&apos;s HPB Surgery</strong>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left mb-10">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => startWithQuestion(q)}
              className="px-4 py-3 rounded-xl text-sm font-serif text-ink-muted text-left transition-colors"
              style={{
                backgroundColor: "var(--papyrus-light)",
                border: "1px solid var(--papyrus-border)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "var(--ink-muted)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "var(--papyrus-border)";
                e.currentTarget.style.color = "var(--ink-muted)";
              }}
            >
              {q}
            </button>
          ))}
        </div>

        <p className="font-serif text-xs text-ink-faint">
          Grounded in Fischer, Sabiston, Shackelford, and Blumgart
        </p>
      </div>
    </div>
  );
}
