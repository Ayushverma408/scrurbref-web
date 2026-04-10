"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import SourcesPanel, { type Chunk } from "./SourcesPanel";
import ImagesPanel, { type ScrapedImage } from "./ImagesPanel";

export type MessageStatus = "retrieving" | "generating" | "done" | "error";
export type MessageMode   = "standard" | "viva" | "quiz";

export interface MessageLatency {
  hydeS?: number;
  embedS?: number;
  searchS?: number;
  rerankS?: number;
  retrievalS?: number;
  llmS?: number;
  totalS?: number;
}

export interface MCQ {
  q:    string;
  opts: { A: string; B: string; C: string; D: string };
  ans:  string;  // "A" | "B" | "C" | "D"
  exp:  string;
}

export interface PubMedRef {
  pmid:    string;
  title:   string;
  authors: string;
  year:    string;
  journal: string;
  url:     string;
}

export interface Message {
  id:          string;
  role:        "user" | "assistant";
  content:     string;
  chunks?:     Chunk[];
  images?:     ScrapedImage[];
  status?:     MessageStatus;
  statusLabel?: string;
  latency?:    MessageLatency;
  mode?:       MessageMode;
  mcqs?:       MCQ[];
  pubmedRefs?: PubMedRef[];
}

const FALLBACK_LABELS: Record<string, string> = {
  retrieving: "Thinking…",
  generating: "Generating response…",
};

const QUIZ_LABELS: Record<string, string> = {
  retrieving: "Searching textbooks…",
  generating: "Generating quiz questions…",
};

function StatusLine({ status, label, isQuiz }: { status: MessageStatus; label?: string; isQuiz?: boolean }) {
  const fallbacks = isQuiz ? QUIZ_LABELS : FALLBACK_LABELS;
  const text = label ?? fallbacks[status] ?? "Working…";
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "var(--ink-muted)" }} />
      <span className="font-serif text-xs text-ink-muted italic">{text}</span>
    </div>
  );
}

function LatencyBar({ latency }: { latency: MessageLatency }) {
  const fmt = (s?: number) => s != null ? `${s.toFixed(1)}s` : null;

  const parts: { label: string; value: string }[] = [];
  if (latency.hydeS != null)   parts.push({ label: "HyDE",     value: fmt(latency.hydeS)! });
  if (latency.searchS != null) parts.push({ label: "search",   value: fmt(latency.searchS)! });
  if (latency.rerankS != null) parts.push({ label: "rerank",   value: fmt(latency.rerankS)! });
  if (latency.llmS != null)    parts.push({ label: "generate", value: fmt(latency.llmS)! });
  if (latency.totalS != null)  parts.push({ label: "total",    value: fmt(latency.totalS)! });

  if (!parts.length) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      {parts.map(({ label, value }, i) => (
        <span key={label} className="font-serif text-xs text-ink-faint flex items-center gap-1">
          {i > 0 && i === parts.length - 1
            ? <span className="text-ink-faint opacity-40 mr-1">·</span>
            : null}
          <span style={{ color: "var(--ink-faint)" }}>{label}</span>
          <span style={{ color: "var(--ink-muted)" }}>{value}</span>
        </span>
      ))}
    </div>
  );
}

function MCQCard({ mcq, index }: { mcq: MCQ; index: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const revealed = selected !== null;

  const optionStyle = (key: string) => {
    if (!revealed) return {
      backgroundColor: "var(--papyrus)",
      border: "1px solid var(--papyrus-border)",
      cursor: "pointer",
    };
    if (key === mcq.ans) return {
      backgroundColor: "#dcfce7",
      border: "1px solid #86efac",
      cursor: "default",
    };
    if (key === selected) return {
      backgroundColor: "#fee2e2",
      border: "1px solid #fca5a5",
      cursor: "default",
    };
    return {
      backgroundColor: "var(--papyrus)",
      border: "1px solid var(--papyrus-border)",
      opacity: 0.5,
      cursor: "default",
    };
  };

  return (
    <div
      className="rounded-xl p-4 mb-3 last:mb-0"
      style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
    >
      {/* Question */}
      <p className="font-serif text-sm font-medium text-ink mb-3 leading-relaxed">
        <span className="text-ink-muted mr-2">Q{index + 1}.</span>
        {mcq.q}
      </p>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {(["A", "B", "C", "D"] as const).map((key) => (
          <button
            key={key}
            onClick={() => !revealed && setSelected(key)}
            disabled={revealed}
            className="text-left px-3 py-2 rounded-lg font-serif text-sm leading-relaxed transition-all"
            style={optionStyle(key)}
          >
            <span className="font-medium mr-2">{key}.</span>
            {mcq.opts[key]}
            {revealed && key === mcq.ans && (
              <span className="ml-2 text-green-600 font-medium">✓</span>
            )}
            {revealed && key === selected && key !== mcq.ans && (
              <span className="ml-2 text-red-500 font-medium">✗</span>
            )}
          </button>
        ))}
      </div>

      {/* Explanation — shown after reveal */}
      {revealed && (
        <div
          className="px-3 py-2 rounded-lg font-serif text-xs leading-relaxed text-ink-muted"
          style={{ backgroundColor: "var(--papyrus)", border: "1px solid var(--papyrus-border)" }}
        >
          <span className="font-medium text-ink">Explanation: </span>
          {mcq.exp}
        </div>
      )}

      {/* Tap prompt */}
      {!revealed && (
        <p className="font-serif text-xs text-ink-faint italic">Tap an option to reveal the answer</p>
      )}
    </div>
  );
}

function PubMedPanel({ refs }: { refs: PubMedRef[] }) {
  if (!refs.length) return null;
  return (
    <div className="mt-3">
      <p
        className="font-serif text-xs font-semibold mb-2 flex items-center gap-1"
        style={{ color: "var(--ink-muted)" }}
      >
        Recent Research
      </p>
      <div className="space-y-2">
        {refs.map((ref) => (
          <a
            key={ref.pmid}
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{
              backgroundColor: "var(--papyrus)",
              border: "1px solid var(--papyrus-border)",
            }}
          >
            <p className="font-serif text-xs font-medium text-ink leading-snug mb-0.5">{ref.title}</p>
            <p className="font-serif text-xs" style={{ color: "var(--ink-faint)" }}>
              {ref.authors}{ref.authors && ref.year ? " · " : ""}{ref.year}
              {ref.journal ? ` · ${ref.journal}` : ""}
              <span className="ml-1" style={{ color: "var(--ink-muted)" }}>↗</span>
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[90%] sm:max-w-[75%] px-4 py-3 rounded-2xl font-serif text-sm leading-relaxed"
          style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const status  = message.status ?? "done";
  const isQuiz  = message.mode === "quiz";
  const isViva  = message.mode === "viva";

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] sm:max-w-[85%]">
        {/* Status indicator */}
        {status !== "done" && status !== "error" && (
          <StatusLine status={status} label={message.statusLabel} isQuiz={isQuiz} />
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 mb-3">
            <span className="font-serif text-xs text-accent italic">Something went wrong.</span>
          </div>
        )}

        {/* Quiz — MCQ cards */}
        {isQuiz && status === "done" && message.mcqs && message.mcqs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="font-serif text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)", color: "var(--ink-muted)" }}
              >
                Quiz · {message.mcqs.length} questions
              </span>
            </div>
            {message.mcqs.map((mcq, i) => (
              <MCQCard key={i} mcq={mcq} index={i} />
            ))}
          </div>
        )}

        {/* Quiz generating — no content yet, spinner already shown above */}
        {isQuiz && status !== "done" && null}

        {/* Standard / Viva — answer text */}
        {!isQuiz && message.content && (
          <div
            className="px-5 py-4 rounded-2xl font-serif text-sm leading-relaxed text-ink prose-custom"
            style={{
              backgroundColor: "var(--papyrus-light)",
              border: "1px solid var(--papyrus-border)",
            }}
          >
            {isViva && (
              <span
                className="inline-block font-serif text-xs font-medium px-2 py-0.5 rounded-full mb-3"
                style={{ backgroundColor: "var(--papyrus)", border: "1px solid var(--papyrus-border)", color: "var(--ink-muted)" }}
              >
                Viva
              </span>
            )}
            <ReactMarkdown
              components={{
                p:          ({ children }) => <p className="mb-3 last:mb-0 font-serif text-sm leading-relaxed">{children}</p>,
                strong:     ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                em:         ({ children }) => <em className="italic">{children}</em>,
                h1:         ({ children }) => <h1 className="font-serif text-lg font-semibold text-ink mt-4 mb-2">{children}</h1>,
                h2:         ({ children }) => <h2 className="font-serif text-base font-semibold text-ink mt-3 mb-2">{children}</h2>,
                h3:         ({ children }) => <h3 className="font-serif text-sm font-semibold text-ink mt-2 mb-1">{children}</h3>,
                ul:         ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                ol:         ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                li:         ({ children }) => <li className="font-serif text-sm leading-relaxed">{children}</li>,
                code:       ({ children }) => (
                  <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ backgroundColor: "var(--papyrus)", border: "1px solid var(--papyrus-border)" }}>
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="pl-3 my-2 font-serif italic text-ink-muted" style={{ borderLeft: "3px solid var(--papyrus-border)" }}>
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Sources — shown as soon as chunks arrive */}
        {!isQuiz && (status === "generating" || status === "done") && message.chunks && message.chunks.length > 0 && (
          <SourcesPanel chunks={message.chunks} />
        )}

        {/* Scraped figures */}
        {!isQuiz && (status === "generating" || status === "done") && message.images && message.images.length > 0 && (
          <ImagesPanel images={message.images} token="" />
        )}

        {/* PubMed recent research — shown after full answer */}
        {!isQuiz && status === "done" && message.pubmedRefs && message.pubmedRefs.length > 0 && (
          <PubMedPanel refs={message.pubmedRefs} />
        )}

        {/* Latency breakdown */}
        {status === "done" && message.latency && (
          <LatencyBar latency={message.latency} />
        )}
      </div>
    </div>
  );
}
