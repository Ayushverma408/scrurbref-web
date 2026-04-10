"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MessageBubble, { type Message, type MessageStatus, type MessageLatency, type MessageMode, type MCQ } from "./MessageBubble";
import ChatInput from "./ChatInput";
import { type Chunk } from "./SourcesPanel";
import { type ScrapedImage } from "./ImagesPanel";
import { useThread } from "./ThreadContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SUB_PHASE_LABELS: Record<string, string> = {
  hyde:   "Thinking…",
  embed:  "Embedding the query…",
  search: "Searching across 4 textbooks…",
  rerank: "Reranking and checking relevance…",
};

interface ChatViewProps {
  threadId: string;
  initialQuestion?: string;
  initialMode?: MessageMode;
}

function tryParseJSON(s: string): any[] {
  try { return JSON.parse(s); } catch { return []; }
}

export default function ChatView({ threadId, initialQuestion, initialMode }: ChatViewProps) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState(initialQuestion ?? "");
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode]           = useState<MessageMode>(initialMode ?? "standard");
  const [limitHit, setLimitHit]   = useState<{ type: "daily" | "monthly"; reset: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const { setIsNavigating } = useThread();

  // Load existing thread messages
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsNavigating(false); return; }

      const res = await fetch(`${API_URL}/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setIsNavigating(false); return; }
      const thread = await res.json();

      if (thread.messages.length > 0) {
        setMessages(
          thread.messages.map((m: any) => {
            const isQuiz = m.pipeline === "quiz";
            return {
              id:      m.id,
              role:    m.role,
              content: isQuiz ? "" : m.content,
              mcqs:    isQuiz ? tryParseJSON(m.content) : undefined,
              mode:    isQuiz ? "quiz" : undefined,
              chunks:  m.chunkRefs ?? [],
              status:  "done" as MessageStatus,
            };
          })
        );
      }
      setIsNavigating(false);
    }
    load();
  }, [threadId, setIsNavigating]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send if initialQuestion provided
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (initialQuestion && !autoSentRef.current && messages.length === 0) {
      autoSentRef.current = true;
      setInput(initialQuestion);
      setTimeout(() => { sendMessage(initialQuestion); }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  async function sendMessage(text: string) {
    if (!text || streaming) return;

    if (mode === "quiz") {
      await sendQuiz(text);
    } else {
      await sendQuery(text);
    }
  }

  async function sendQuery(question: string) {
    setInput("");
    setStreaming(true);

    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    "user",
      content: question,
      status:  "done",
    };
    const assistantId  = crypto.randomUUID();
    const assistantMsg: Message = {
      id:      assistantId,
      role:    "assistant",
      content: "",
      status:  "retrieving",
      chunks:  [],
      images:  [],
      mode:    mode,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata ?? {};

      // Build profile context: structured identity first (specialty/year), then free-text notes.
      // This is WHO the user is — answer style is controlled by the structured settings below.
      const identityParts: string[] = [];
      if (meta.training_year) identityParts.push(meta.training_year);
      if (meta.specialty)     identityParts.push(meta.specialty);
      const identityLine   = identityParts.join(", ");
      const freeText       = (meta.profile_prompt ?? "").trim();
      const profilePrompt  = [identityLine, freeText].filter(Boolean).join(". ");

      const answerDepth           = meta.answer_depth           ?? "balanced";
      const answerTone            = meta.answer_tone            ?? "teaching";
      const answerRestrictiveness = meta.answer_restrictiveness ?? "guided";

      const res = await fetch(`${API_URL}/query/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question,
          threadId,
          freeMode:             false,
          useHyde:              false,
          profilePrompt,
          answerDepth,
          answerTone,
          answerRestrictiveness,
          vivaMode:             mode === "viva",
        }),
      });

      if (res.status === 429) {
        const err  = await res.json().catch(() => ({}));
        const type = err.reset === "tomorrow" ? "daily" : "monthly";
        setLimitHit({ type, reset: err.reset });
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

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
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, status: "retrieving", statusLabel: undefined } : m)
              );
            } else if (data.phase === "sub_phase") {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, statusLabel: SUB_PHASE_LABELS[data.label] ?? data.label } : m)
              );
            } else if (data.phase === "retrieved") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, status: "generating", statusLabel: undefined, chunks: data.chunks ?? [] }
                    : m
                )
              );
            } else if (data.phase === "generating") {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, status: "generating", statusLabel: undefined } : m)
              );
            } else if (data.phase === "token") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, status: "generating", content: (m.content ?? "") + (data.delta ?? "") }
                    : m
                )
              );
            } else if (data.phase === "done") {
              const latency: MessageLatency = {
                hydeS:   data.latency_hyde_s,
                embedS:  data.latency_embed_s,
                searchS: data.latency_search_s,
                rerankS: data.latency_rerank_s,
                llmS:    data.latency_llm_s,
                totalS:  data.latency_total_s,
              };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content:    data.answer ?? "",
                        chunks:     data.chunks ?? [],
                        images:     (data.images ?? []) as ScrapedImage[],
                        pubmedRefs: data.pubmed_refs ?? [],
                        status:     "done",
                        latency,
                      }
                    : m
                )
              );
            } else if (data.phase === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: data.msg ?? "An error occurred.", status: "error" }
                    : m
                )
              );
            }
          } catch { /* malformed SSE — skip */ }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: err.message ?? "Something went wrong.", status: "error" }
            : m
        )
      );
    } finally {
      setStreaming(false);
      router.refresh(); // update sidebar title after first message
    }
  }

  async function sendQuiz(topic: string) {
    setInput("");
    setStreaming(true);

    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    "user",
      content: `Quiz: ${topic}`,
      status:  "done",
    };
    const assistantId  = crypto.randomUUID();
    const assistantMsg: Message = {
      id:      assistantId,
      role:    "assistant",
      content: "",
      status:  "retrieving",
      chunks:  [],
      mode:    "quiz",
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(`${API_URL}/quiz/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ topic, count: 5, threadId }),
      });

      if (res.status === 429) {
        const err  = await res.json().catch(() => ({}));
        const type = err.reset === "tomorrow" ? "daily" : "monthly";
        setLimitHit({ type, reset: err.reset });
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

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
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, status: "retrieving" } : m)
              );
            } else if (data.phase === "retrieved") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, status: "generating", chunks: data.chunks ?? [] }
                    : m
                )
              );
            } else if (data.phase === "generating") {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, status: "generating" } : m)
              );
            } else if (data.phase === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        mcqs:   (data.mcqs ?? []) as MCQ[],
                        chunks: data.chunks ?? [],
                        status: "done",
                      }
                    : m
                )
              );
            } else if (data.phase === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: data.msg ?? "An error occurred.", status: "error" }
                    : m
                )
              );
            }
          } catch { /* malformed SSE — skip */ }
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: err.message ?? "Something went wrong.", status: "error" }
            : m
        )
      );
    } finally {
      setStreaming(false);
      router.refresh(); // update sidebar title after quiz
    }
  }

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

  const exampleQuestions = [
    "Steps of a Whipple for pancreatic head cancer",
    "Anatomical basis of posterior adrenalectomy",
    "Management of CBD injury found intraoperatively",
    "Blood supply to the oesophagus and implications for oesophagectomy",
    "Layers of the anterior abdominal wall",
    "Indications for damage control laparotomy",
  ];

  const exampleTopics = [
    "Hepatic anatomy",
    "Portal hypertension",
    "Pancreatic head resection",
    "Bile duct anatomy",
    "Abdominal wall hernias",
    "Colorectal anatomy",
  ];

  const exampleVivaQuestions = [
    "Anatomical basis of cholecystectomy",
    "Layers encountered during inguinal hernia repair",
    "Blood supply of the stomach in oesophagectomy",
    "Relations of the common bile duct",
    "Surgical anatomy of the portal triad",
    "Define Pringle manoeuvre and its basis",
  ];

  const examples = mode === "quiz" ? exampleTopics : mode === "viva" ? exampleVivaQuestions : exampleQuestions;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 space-y-6">
        {messages.length === 0 && (
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
                  onClick={() => !streaming && sendMessage(q)}
                  disabled={streaming}
                  className="text-left px-4 py-3 rounded-xl font-serif text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
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
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input / limit block */}
      {limitHit ? (
        <div
          className="px-4 py-4 text-center"
          style={{ borderTop: "1px solid var(--papyrus-border)", backgroundColor: "var(--papyrus)" }}
        >
          <p className="font-serif text-sm text-ink mb-1">
            {limitHit.type === "daily"
              ? "You've used all 30 messages for today. Resets tomorrow."
              : "You've used all 100 free messages this month. Upgrade to ScrubRef Pro for unlimited access."}
          </p>
          <p className="font-serif text-xs text-ink-faint">
            {limitHit.type === "daily" ? "Come back tomorrow to continue." : "Billing coming soon — check back shortly."}
          </p>
        </div>
      ) : (
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage(input.trim())}
          disabled={streaming}
          mode={mode}
          onModeChange={setMode}
        />
      )}
    </div>
  );
}
