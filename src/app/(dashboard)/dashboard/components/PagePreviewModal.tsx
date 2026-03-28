"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface PagePreviewModalProps {
  collection: string;
  page: number;
  source: string;
  chunkContent?: string;
  onClose: () => void;
}

interface PageImage {
  pageNum: number;
  label: string;
  url: string;
  isCurrent: boolean;
}

export default function PagePreviewModal({
  collection, page, source, chunkContent, onClose,
}: PagePreviewModalProps) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPages() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Fetch prev, current, next pages in parallel
        const pageNums = [page - 1, page, page + 1].filter((p) => p > 0);
        const results = await Promise.all(
          pageNums.map(async (p) => {
            const params = new URLSearchParams();
            if (p === page && chunkContent) {
              params.set("highlight", chunkContent.slice(0, 120));
            }
            const url = `${API_URL}/page/${collection}/${p}?${params}`;
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) return null;
            const blob = await res.blob();
            return {
              pageNum: p,
              label: p === page ? `p.${p} — exact match` : p < page ? `◀ p.${p}` : `▶ p.${p}`,
              url: URL.createObjectURL(blob),
              isCurrent: p === page,
            };
          })
        );

        setPages(results.filter(Boolean) as PageImage[]);
      } catch {
        setError("Could not load page preview.");
      } finally {
        setLoading(false);
      }
    }
    loadPages();
  }, [collection, page, chunkContent]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-5"
          style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="font-serif font-semibold text-ink text-sm">
              📄 {source}, p.{page}
              <span className="font-normal text-ink-muted ml-2">· highlighted in yellow</span>
            </p>
            <button onClick={onClose} className="text-ink-faint hover:text-ink text-xl leading-none">×</button>
          </div>

          {loading && (
            <p className="font-serif text-sm text-ink-muted italic text-center py-8">
              Loading pages…
            </p>
          )}
          {error && (
            <p className="font-serif text-sm text-accent text-center py-8">{error}</p>
          )}

          {/* Pages */}
          <div className="space-y-4">
            {pages.map((pg) => (
              <div key={pg.pageNum}>
                <p
                  className="font-serif text-xs font-semibold mb-1"
                  style={{ color: pg.isCurrent ? "var(--accent)" : "var(--ink-muted)" }}
                >
                  {pg.label}
                </p>
                <img
                  src={pg.url}
                  alt={`Page ${pg.pageNum}`}
                  className="w-full rounded-lg"
                  style={{
                    border: pg.isCurrent
                      ? "2px solid var(--accent)"
                      : "1px solid var(--papyrus-border)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
