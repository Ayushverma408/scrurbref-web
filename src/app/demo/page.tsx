"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import MessageBubble, { type Message, type MessageLatency } from "@/app/(dashboard)/dashboard/components/MessageBubble";
import { type Chunk } from "@/app/(dashboard)/dashboard/components/SourcesPanel";

const DEMO_LIMIT = 5;

const SUB_PHASE_LABELS: Record<string, string> = {
  hyde:   "Thinking…",
  embed:  "Embedding the query…",
  search: "Searching across 4 textbooks…",
  rerank: "Reranking and checking relevance…",
};

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
  { id: "strict", icon: "🔒", label: "By the book" },
  { id: "guided", icon: "🔀", label: "Guided" },
  { id: "open",   icon: "🧠", label: "Full knowledge" },
];


export default function DemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [used, setUsed] = useState(0);
  const [limitHit, setLimitHit] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings — local state, no Supabase
  const [depth, setDepth] = useState("balanced");
  const [tone, setTone] = useState("teaching");
  const [restrictiveness, setRestrictiveness] = useState("guided");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/demo/usage")
      .then((r) => r.json())
      .then((d) => {
        setUsed(d.used ?? 0);
        if ((d.used ?? 0) >= DEMO_LIMIT) setLimitHit(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  async function sendMessage() {
    const question = input.trim();
    if (!question || streaming || limitHit) return;

    setInput("");
    setStreaming(true);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: question, status: "done" };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", status: "retrieving", chunks: [] };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const res = await fetch("/demo/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answerDepth: depth,
          answerTone: tone,
          answerRestrictiveness: restrictiveness,
        }),
      });

      if (res.status === 429) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setUsed(DEMO_LIMIT);
        setLimitHit(true);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const data = JSON.parse(dataLine.slice(6));
            if (data.phase === "retrieving") {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, status: "retrieving", statusLabel: undefined } : m));
            } else if (data.phase === "sub_phase") {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, statusLabel: SUB_PHASE_LABELS[data.label] ?? data.label } : m));
            } else if (data.phase === "retrieved") {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, status: "generating", statusLabel: undefined, chunks: data.chunks ?? [] } : m));
            } else if (data.phase === "token") {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, status: "generating", content: (m.content ?? "") + (data.delta ?? "") } : m));
            } else if (data.phase === "done") {
              const latency: MessageLatency = {
                hydeS:   data.latency_hyde_s,
                embedS:  data.latency_embed_s,
                searchS: data.latency_search_s,
                rerankS: data.latency_rerank_s,
                llmS:    data.latency_llm_s,
                totalS:  data.latency_total_s,
              };
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: data.answer ?? "", chunks: data.chunks ?? [], status: "done", latency } : m));
              setUsed((u) => {
                const next = u + 1;
                if (next >= DEMO_LIMIT) setLimitHit(true);
                return next;
              });
            } else if (data.phase === "error") {
              setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: data.msg ?? "An error occurred.", status: "error" } : m));
            }
          } catch { /* malformed SSE */ }
        }
      }
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: err.message ?? "Something went wrong.", status: "error" } : m));
    } finally {
      setStreaming(false);
    }
  }

  const remaining = Math.max(0, DEMO_LIMIT - used);

  return (
    <div className="flex flex-col h-screen bg-papyrus">

      {/* Top bar */}
      <div
        className="shrink-0 flex items-center justify-between px-4 py-3 sm:px-6"
        style={{ borderBottom: "1px solid var(--papyrus-border)", backgroundColor: "var(--papyrus-light)" }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo-192.png" alt="ScrubRef" className="w-8 h-8 rounded-full" />
          <span className="font-serif text-base font-semibold text-ink">ScrubRef</span>
          <span className="font-serif text-xs text-ink-faint italic hidden sm:inline">— surgical knowledge, cited.</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Settings toggle */}
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="font-serif text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: settingsOpen ? "var(--ink)" : "var(--papyrus)",
              border: "1px solid var(--papyrus-border)",
              color: settingsOpen ? "var(--papyrus)" : "var(--ink-muted)",
            }}
          >
            ⚙️ Settings
          </button>

          {!limitHit && (
            <span className="font-serif text-xs text-ink-muted">
              {remaining} free {remaining === 1 ? "question" : "questions"} left
            </span>
          )}
          <Link
            href="/signup"
            className="font-serif text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
          >
            Sign up free
          </Link>
          <Link href="/login" className="font-serif text-xs text-ink-muted hover:text-ink transition-colors hidden sm:inline">
            Sign in
          </Link>
        </div>
      </div>

      {/* Settings panel (collapsible, below top bar) */}
      {settingsOpen && (
        <div
          className="shrink-0 px-4 py-4 sm:px-6 space-y-3"
          style={{ borderBottom: "1px solid var(--papyrus-border)", backgroundColor: "var(--papyrus-light)" }}
        >
          <div className="flex flex-wrap gap-6">
            {/* Depth */}
            <div>
              <p className="font-serif text-xs font-medium text-ink mb-1.5">Answer depth</p>
              <div className="flex gap-1.5">
                {DEPTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDepth(opt.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-serif transition-all"
                    style={{
                      backgroundColor: depth === opt.id ? "var(--ink)" : "var(--papyrus)",
                      border: `1.5px solid ${depth === opt.id ? "var(--ink)" : "var(--papyrus-border)"}`,
                      color: depth === opt.id ? "var(--papyrus)" : "var(--ink-muted)",
                    }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone */}
            <div>
              <p className="font-serif text-xs font-medium text-ink mb-1.5">Tone</p>
              <div className="flex gap-1.5">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTone(opt.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-serif transition-all"
                    style={{
                      backgroundColor: tone === opt.id ? "var(--ink)" : "var(--papyrus)",
                      border: `1.5px solid ${tone === opt.id ? "var(--ink)" : "var(--papyrus-border)"}`,
                      color: tone === opt.id ? "var(--papyrus)" : "var(--ink-muted)",
                    }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Knowledge source */}
            <div>
              <p className="font-serif text-xs font-medium text-ink mb-1.5">Knowledge source</p>
              <div className="flex gap-1.5">
                {RESTRICTIVENESS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setRestrictiveness(opt.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-serif transition-all"
                    style={{
                      backgroundColor: restrictiveness === opt.id ? "var(--ink)" : "var(--papyrus)",
                      border: `1.5px solid ${restrictiveness === opt.id ? "var(--ink)" : "var(--papyrus-border)"}`,
                      color: restrictiveness === opt.id ? "var(--papyrus)" : "var(--ink-muted)",
                    }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-lg mx-auto w-full px-4 pt-10">
            <p className="font-serif text-base font-medium text-ink text-center mb-1">Ask any surgical question.</p>
            <p className="font-serif text-sm text-ink-muted italic text-center mb-6">
              {DEMO_LIMIT} free questions · No signup required
            </p>

            <div
              className="rounded-2xl px-6 py-5 space-y-4"
              style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
            >
              {[
                { step: "1", title: "Grounded answers, every time", body: "Searches Fischer, Sabiston, Shackelford, and Blumgart simultaneously. Every claim is traceable — no hallucinations." },
                { step: "2", title: "Tune it to how you think", body: "Hit ⚙️ Settings to set answer depth, tone, and how strictly it sticks to the textbooks." },
                { step: "3", title: "See exactly what was retrieved", body: "After each answer, source passages are listed with book and page number so you know what was actually used." },
                { step: "4", title: "Open the real page", body: "Click any citation pill to pull up the actual PDF page — highlighted where the answer came from." },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-serif text-xs font-semibold mt-0.5"
                    style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
                  >
                    {step}
                  </span>
                  <div>
                    <p className="font-serif text-sm font-semibold text-ink leading-snug">{title}</p>
                    <p className="font-serif text-xs text-ink-muted leading-relaxed mt-0.5">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input / limit wall */}
      {limitHit ? (
        <div
          className="shrink-0 px-4 py-6 text-center"
          style={{ borderTop: "1px solid var(--papyrus-border)", backgroundColor: "var(--papyrus-light)" }}
        >
          <p className="font-serif text-base font-semibold text-ink mb-1">You've used your {DEMO_LIMIT} free questions.</p>
          <p className="font-serif text-sm text-ink-muted mb-4">
            Sign up free to get 30 questions/day and save your conversation history.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/signup"
              className="font-serif text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
              style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
            >
              Sign up free
            </Link>
            <Link href="/login" className="font-serif text-sm text-ink-muted hover:text-ink transition-colors">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="shrink-0 px-3 py-3 sm:px-4"
          style={{
            backgroundColor: "var(--papyrus)",
            borderTop: "1px solid var(--papyrus-border)",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{
              backgroundColor: "var(--papyrus-light)",
              border: "1.5px solid var(--papyrus-border)",
              transition: "border-color 0.15s",
            }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--ink-muted)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--papyrus-border)")}
          >
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type your question here…"
                disabled={streaming}
                rows={1}
                maxLength={2000}
                className="resize-none font-serif text-sm text-ink bg-transparent outline-none leading-relaxed disabled:opacity-50 w-full"
                style={{ maxHeight: "160px" }}
              />
              {input.length > 1500 && (
                <span className="text-xs font-serif self-end" style={{ color: input.length >= 2000 ? "var(--accent)" : "var(--ink-faint)" }}>
                  {input.length}/2000
                </span>
              )}
            </div>
            <button
              onClick={sendMessage}
              disabled={streaming || !input.trim()}
              className="shrink-0 px-4 py-2 rounded-lg text-sm font-serif font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
            >
              Answer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
