"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ScrapedImage {
  path: string;   // absolute path from server e.g. /Users/.../data/images/fischer_surgery/page_2581_img_0.png
  caption: string;
}

function pathToUrl(path: string, token: string): string {
  // Extract collection and filename from absolute path
  const match = path.match(/data\/images\/([^/]+)\/([^/]+)$/);
  if (!match) return "";
  const [, collection, filename] = match;
  return `${API_URL}/images/${collection}/${filename}`;
}

interface ImagesPanelProps {
  images: ScrapedImage[];
  token: string;
}

export default function ImagesPanel({ images, token }: ImagesPanelProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  if (!images.length) return null;

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--papyrus-border)" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 font-serif text-sm font-semibold text-ink transition-colors"
        style={{ backgroundColor: "var(--papyrus-light)" }}
      >
        <span>🖼️ Figures from textbooks · {images.length} image{images.length !== 1 ? "s" : ""}</span>
        <span className="text-xs text-ink-muted">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div
          className="p-4 grid grid-cols-2 gap-3"
          style={{ backgroundColor: "var(--papyrus-light)", borderTop: "1px solid var(--papyrus-border)" }}
        >
          {images.slice(0, 6).map((img, i) => {
            const url = pathToUrl(img.path, token);
            if (!url) return null;
            return (
              <div key={i} className="space-y-1">
                <img
                  src={url}
                  alt={img.caption || `Figure ${i + 1}`}
                  className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ border: "1px solid var(--papyrus-border)" }}
                  onClick={() => setSelected(selected === i ? null : i)}
                  // Auth header can't be set on <img>, so scrubref-api needs to accept token via cookie or query param
                  // For now: images served without auth (see note in images route)
                />
                {img.caption && (
                  <p className="font-serif text-xs text-ink-muted italic">{img.caption}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
