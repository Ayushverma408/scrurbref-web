"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import MessageBubble, { type Message, type MessageStatus, type MessageLatency } from "./MessageBubble";
import ChatInput from "./ChatInput";
import { type Chunk } from "./SourcesPanel";
import { type ScrapedImage } from "./ImagesPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SUB_PHASE_LABELS: Record<string, string> = {
  hyde:   "Thinking…",
  embed:  "Embedding the query…",
  search: "Searching across 4 textbooks…",
  rerank: "Reranking and checking relevance…",
};

interface ChatViewProps {
  threadId: string;
  initialQuestion?: string; // pre-fill from example question click
}

export default function ChatView({ threadId, initialQuestion }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [streaming, setStreaming] = useState(false);
  const [limitHit, setLimitHit] = useState<{ type: "daily" | "monthly"; reset: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load existing messages
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_URL}/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const thread = await res.json();

      if (thread.messages.length > 0) {
        setMessages(
          thread.messages.map((m: any) => ({
            id:      m.id,
            role:    m.role,
            content: m.content,
            chunks:  m.chunkRefs ?? [],
            status:  "done" as MessageStatus,
          }))
        );
      }
    }
    load();
  }, [threadId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send if initialQuestion provided (from example question click)
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (initialQuestion && !autoSentRef.current && messages.length === 0) {
      autoSentRef.current = true;
      setInput(initialQuestion);
      // Small delay to let state settle, then send
      setTimeout(() => {
        sendMessageText(initialQuestion);
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  async function sendMessageText(question: string) {
    if (!question || streaming) return;

    setInput("");
    setStreaming(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps

    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    "user",
      content: question,
      status:  "done",
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id:      assistantId,
      role:    "assistant",
      content: "",
      status:  "retrieving",
      chunks:  [],
      images:  [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Get user settings from metadata
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata ?? {};
      const profilePrompt        = meta.profile_prompt        ?? "";
      const answerDepth          = meta.answer_depth          ?? "balanced";
      const answerTone           = meta.answer_tone           ?? "teaching";
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
          freeMode: false,
          useHyde: true,
          profilePrompt,
          answerDepth,
          answerTone,
          answerRestrictiveness,
        }),
      });

      if (res.status === 429) {
        const err = await res.json().catch(() => ({}));
        const type = err.reset === "tomorrow" ? "daily" : "monthly";
        setLimitHit({ type, reset: err.reset });
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

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
                hydeS:     data.latency_hyde_s,
                embedS:    data.latency_embed_s,
                searchS:   data.latency_search_s,
                rerankS:   data.latency_rerank_s,
                llmS:      data.latency_llm_s,
                totalS:    data.latency_total_s,
              };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: data.answer ?? "",
                        chunks:  data.chunks ?? [],
                        images:  (data.images ?? []) as ScrapedImage[],
                        status:  "done",
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
          } catch {
            // malformed SSE event — skip
          }
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
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full px-4 py-10 text-center select-none">
            <p className="font-serif text-2xl font-semibold text-ink mb-1">What do you want to look up?</p>
            <p className="font-serif text-sm text-ink-muted mb-8">
              Answers grounded in 4 surgical textbooks — every claim is citable.
            </p>

            <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Steps of a Whipple for pancreatic head cancer",
                "Anatomical basis of posterior adrenalectomy",
                "Management of CBD injury found intraoperatively",
                "Blood supply to the oesophagus and implications for oesophagectomy",
                "Layers of the anterior abdominal wall",
                "Indications for damage control laparotomy",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => !streaming && sendMessageText(q)}
                  disabled={streaming}
                  className="text-left px-4 py-3 rounded-xl font-serif text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--papyrus-light)",
                    border: "1px solid var(--papyrus-border)",
                  }}
                >
                  {q}
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
          onSubmit={() => sendMessageText(input.trim())}
          disabled={streaming}
        />
      )}
    </div>
  );
}
