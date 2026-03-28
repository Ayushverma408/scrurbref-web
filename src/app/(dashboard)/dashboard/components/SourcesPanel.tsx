"use client";

import { useState } from "react";
import PagePreviewModal from "./PagePreviewModal";

export interface Chunk {
  page: number;
  source: string;
  collection: string;
  content: string;
}

export default function SourcesPanel({ chunks }: { chunks: Chunk[] }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Chunk | null>(null);

  if (!chunks.length) return null;

  return (
    <>
      <div
        className="mt-4 rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--papyrus-border)" }}
      >
        {/* Header */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 font-serif text-sm font-semibold text-ink transition-colors"
          style={{ backgroundColor: "var(--papyrus-light)" }}
        >
          <span>📚 Sources · {chunks.length} passage{chunks.length !== 1 ? "s" : ""} retrieved</span>
          <span className="text-xs text-ink-muted">{open ? "▾" : "▸"}</span>
        </button>

        {/* Citation pills with page preview buttons */}
        <div
          className="px-4 py-2 flex flex-wrap gap-1.5"
          style={{ backgroundColor: "var(--papyrus-light)", borderTop: "1px solid var(--papyrus-border)" }}
        >
          {chunks.map((c, i) => (
            <button
              key={i}
              onClick={() => setPreview(c)}
              title="Click to preview this page"
              className="text-xs font-serif px-2 py-0.5 rounded-full transition-colors hover:opacity-80"
              style={{
                backgroundColor: "var(--papyrus)",
                border: "1px solid var(--papyrus-border)",
                color: "var(--ink-muted)",
              }}
            >
              📄 {c.source} p.{c.page}
            </button>
          ))}
        </div>

        {/* Expanded chunk text */}
        {open && (
          <div
            className="divide-y"
            style={{
              backgroundColor: "var(--papyrus-light)",
              borderTop: "1px solid var(--papyrus-border)",
            }}
          >
            {chunks.map((c, i) => (
              <div key={i} className="px-4 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-serif text-xs font-semibold text-ink">
                    [{i + 1}] {c.source}, Page {c.page}
                  </p>
                  <button
                    onClick={() => setPreview(c)}
                    className="text-xs font-serif px-2 py-0.5 rounded transition-colors"
                    style={{
                      backgroundColor: "var(--papyrus)",
                      border: "1px solid var(--papyrus-border)",
                      color: "var(--ink-muted)",
                    }}
                  >
                    📄 Preview page
                  </button>
                </div>
                <blockquote
                  className="chunk-text text-sm pl-3"
                  style={{ borderLeft: "3px solid var(--papyrus-border)" }}
                >
                  {c.content}
                </blockquote>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Page preview modal */}
      {preview && (
        <PagePreviewModal
          collection={preview.collection}
          page={preview.page}
          source={preview.source}
          chunkContent={preview.content}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
