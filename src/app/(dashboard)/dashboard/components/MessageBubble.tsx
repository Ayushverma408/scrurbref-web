"use client";

import ReactMarkdown from "react-markdown";
import SourcesPanel, { type Chunk } from "./SourcesPanel";
import ImagesPanel, { type ScrapedImage } from "./ImagesPanel";

export type MessageStatus = "retrieving" | "generating" | "done" | "error";

export interface MessageLatency {
  hydeS?: number;
  embedS?: number;
  searchS?: number;
  rerankS?: number;
  retrievalS?: number;
  llmS?: number;
  totalS?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  chunks?: Chunk[];
  images?: ScrapedImage[];
  status?: MessageStatus;
  statusLabel?: string;
  latency?: MessageLatency;
}

const SUB_PHASE_LABELS: Record<string, string> = {
  hyde:   "Generating a hypothetical answer…",
  embed:  "Embedding the query…",
  search: "Searching across 4 textbooks…",
  rerank: "Reranking passages…",
};

const FALLBACK_LABELS: Record<string, string> = {
  retrieving: "Thinking…",
  generating: "Generating response…",
};

function StatusLine({ status, label }: { status: MessageStatus; label?: string }) {
  const text = label ?? FALLBACK_LABELS[status] ?? "Working…";
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
  if (latency.hydeS != null)     parts.push({ label: "HyDE",      value: fmt(latency.hydeS)! });
  if (latency.searchS != null)   parts.push({ label: "search",    value: fmt(latency.searchS)! });
  if (latency.rerankS != null)   parts.push({ label: "rerank",    value: fmt(latency.rerankS)! });
  if (latency.llmS != null)      parts.push({ label: "generate",  value: fmt(latency.llmS)! });
  if (latency.totalS != null)    parts.push({ label: "total",     value: fmt(latency.totalS)! });

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

export default function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[90%] sm:max-w-[75%] px-4 py-3 rounded-2xl font-serif text-sm leading-relaxed"
          style={{
            backgroundColor: "var(--ink)",
            color: "var(--papyrus)",
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const status = message.status ?? "done";

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[95%] sm:max-w-[85%]">
        {/* Status indicator */}
        {status !== "done" && status !== "error" && (
          <StatusLine status={status} label={message.statusLabel} />
        )}
        {status === "error" && (
          <div className="flex items-center gap-2 mb-3">
            <span className="font-serif text-xs text-accent italic">Something went wrong.</span>
          </div>
        )}

        {/* Answer */}
        {message.content && (
          <div
            className="px-5 py-4 rounded-2xl font-serif text-sm leading-relaxed text-ink prose-custom"
            style={{
              backgroundColor: "var(--papyrus-light)",
              border: "1px solid var(--papyrus-border)",
            }}
          >
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0 font-serif text-sm leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                h1: ({ children }) => <h1 className="font-serif text-lg font-semibold text-ink mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="font-serif text-base font-semibold text-ink mt-3 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="font-serif text-sm font-semibold text-ink mt-2 mb-1">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="font-serif text-sm leading-relaxed">{children}</li>,
                code: ({ children }) => (
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

        {/* Sources — shown as soon as chunks arrive (during generation) */}
        {(status === "generating" || status === "done") && message.chunks && message.chunks.length > 0 && (
          <SourcesPanel chunks={message.chunks} />
        )}

        {/* Scraped figures */}
        {(status === "generating" || status === "done") && message.images && message.images.length > 0 && (
          <ImagesPanel images={message.images} token="" />
        )}

        {/* Latency breakdown — only after full answer */}
        {status === "done" && message.latency && (
          <LatencyBar latency={message.latency} />
        )}
      </div>
    </div>
  );
}
