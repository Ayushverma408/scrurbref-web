"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { type Chunk } from "./SourcesPanel";
import ImagesPanel, { type ScrapedImage } from "./ImagesPanel";
import PagePreviewModal from "./PagePreviewModal";

// ── Inline citation processing ─────────────────────────────────────────────

interface InlineCite {
  n:         number;
  bookFull:  string;
  bookShort: string;
  page:      number;
  chunk?:    Chunk;  // matched retrieved chunk for preview
}

function shortenBook(full: string): string {
  const lower = full.toLowerCase();
  if (lower.includes("fischer"))     return "Fischer's";
  if (lower.includes("sabiston"))    return "Sabiston";
  if (lower.includes("shackelford")) return "Shackelford";
  if (lower.includes("blumgart"))    return "Blumgart";
  return full.split(/\s+/)[0];
}

function processCitations(
  content: string,
  chunks: Chunk[] = [],
): { processed: string; cites: InlineCite[] } {
  const cites: InlineCite[] = [];
  const seen  = new Map<string, number>(); // "book-page" → n

  // Matches: (Book Name, Page N) and _(Book Name, Page N)_
  const pattern = /_?\(([^()]+),\s*[Pp]age\s*(\d+)\)_?/g;

  const processed = content.replace(pattern, (_, bookFull, pageStr) => {
    const book = bookFull.trim();
    const page = parseInt(pageStr, 10);
    if (isNaN(page)) return _;

    const key = `${book.toLowerCase()}-${page}`;
    if (!seen.has(key)) {
      const n = cites.length + 1;
      seen.set(key, n);
      const short = shortenBook(book);
      const chunk = chunks.find((c) =>
        c.page === page &&
        (c.source.toLowerCase().includes(short.toLowerCase().replace("'s", "")) ||
         book.toLowerCase().includes(c.source.toLowerCase().split(/\s+/)[0]))
      );
      cites.push({ n, bookFull: book, bookShort: short, page, chunk });
    }

    const n = seen.get(key)!;
    const cite = cites[n - 1] ?? { bookShort: shortenBook(book), page };
    // Embed display text in link so the a-override can render a pill without a lookup
    return `[${cite.bookShort}·${page}](#cite-${n})`;
  });

  return { processed, cites };
}

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
  if (latency.hydeS != null && latency.hydeS > 0)   parts.push({ label: "HyDE",     value: fmt(latency.hydeS)! });
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

function CitePopover({ cite, onPreview, onClose }: {
  cite: InlineCite;
  onPreview: (chunk: Chunk) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 shadow-xl"
        style={{ backgroundColor: "var(--papyrus)", border: "1px solid var(--papyrus-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-serif text-sm font-semibold text-ink leading-snug">{cite.bookFull}</p>
            <p className="font-serif text-xs text-ink-muted mt-0.5">Page {cite.page}</p>
          </div>
          <button
            onClick={onClose}
            className="font-serif text-lg leading-none text-ink-faint hover:text-ink transition-colors ml-4"
          >
            ×
          </button>
        </div>

        {/* Chunk excerpt */}
        {cite.chunk ? (
          <div
            className="font-serif text-xs text-ink-muted leading-relaxed max-h-44 overflow-y-auto px-3 py-2 rounded-xl mb-4"
            style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
          >
            {cite.chunk.content.slice(0, 600)}{cite.chunk.content.length > 600 ? "…" : ""}
          </div>
        ) : (
          <p className="font-serif text-xs text-ink-faint italic mb-4">No passage preview available for this citation.</p>
        )}

        {/* Actions */}
        {cite.chunk && (
          <button
            onClick={() => { onPreview(cite.chunk!); onClose(); }}
            className="w-full font-serif text-sm font-medium py-2.5 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--accent)", color: "var(--papyrus)" }}
          >
            View PDF page →
          </button>
        )}
      </div>
    </div>
  );
}

function AnswerBubble({ message, isViva }: { message: Message; isViva: boolean }) {
  const [selectedCite, setSelectedCite] = useState<InlineCite | null>(null);
  const [previewChunk, setPreviewChunk]  = useState<Chunk | null>(null);
  const { processed, cites } = processCitations(message.content, message.chunks ?? []);

  // Map n → InlineCite so the ReactMarkdown a-override can look up by number
  const citesMap = new Map(cites.map((c) => [c.n, c]));

  return (
    <>
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
            // Intercept [Book·page](#cite-n) links → render as inline pill
            a: ({ href, children }) => {
              if (href?.startsWith("#cite-")) {
                const n   = parseInt(href.replace("#cite-", ""), 10);
                const raw = Array.isArray(children) ? children.join("") : String(children ?? "");
                const [book, page] = raw.split("·");
                return (
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center gap-1 font-serif text-xs cursor-pointer select-none transition-opacity hover:opacity-70 mx-0.5"
                    style={{
                      backgroundColor: "var(--papyrus)",
                      border: "1px solid var(--accent)",
                      borderRadius: "9999px",
                      padding: "0px 6px",
                      color: "var(--accent)",
                      verticalAlign: "middle",
                      lineHeight: "1.6",
                    }}
                    onClick={() => {
                      const cite = citesMap.get(n);
                      if (cite) setSelectedCite(cite);
                    }}
                  >
                    <span>{book}</span>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <span>{page}</span>
                  </span>
                );
              }
              return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
            },
          }}
        >
          {processed}
        </ReactMarkdown>
      </div>

      {selectedCite && (
        <CitePopover
          cite={selectedCite}
          onPreview={setPreviewChunk}
          onClose={() => setSelectedCite(null)}
        />
      )}

      {previewChunk && (
        <PagePreviewModal
          collection={previewChunk.collection}
          page={previewChunk.page}
          source={previewChunk.source}
          chunkContent={previewChunk.content}
          onClose={() => setPreviewChunk(null)}
        />
      )}
    </>
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
          <AnswerBubble message={message} isViva={isViva} />
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
