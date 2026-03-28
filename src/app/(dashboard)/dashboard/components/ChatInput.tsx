"use client";

import { useRef, useEffect } from "react";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export default function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  }

  return (
    <div
      className="px-3 py-3 sm:px-4 flex items-end gap-2 sm:gap-3 pb-safe"
      style={{
        backgroundColor: "var(--papyrus)",
        borderTop: "1px solid var(--papyrus-border)",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 2000))}
          onKeyDown={handleKeyDown}
          placeholder="Type your question here…"
          disabled={disabled}
          rows={1}
          maxLength={2000}
          className="resize-none font-serif text-sm text-ink bg-transparent outline-none leading-relaxed disabled:opacity-50 w-full"
          style={{ maxHeight: "160px" }}
        />
        {value.length > 1500 && (
          <span
            className="text-xs font-serif self-end"
            style={{ color: value.length >= 2000 ? "var(--accent)" : "var(--ink-faint)" }}
          >
            {value.length}/2000
          </span>
        )}
      </div>
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim() || value.length > 2000}
        className="shrink-0 px-4 py-2 rounded-lg text-sm font-serif font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
      >
        Answer
      </button>
    </div>
  );
}
