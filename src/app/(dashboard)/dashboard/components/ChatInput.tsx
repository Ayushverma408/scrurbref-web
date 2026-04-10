"use client";

import { useRef, useEffect } from "react";
import { type MessageMode } from "./MessageBubble";

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  mode: MessageMode;
  onModeChange: (mode: MessageMode) => void;
}

const MODES: { key: MessageMode; label: string; placeholder: string; submit: string }[] = [
  { key: "standard", label: "Answer",  placeholder: "Type your question here…",                   submit: "Answer" },
  { key: "viva",     label: "Viva",    placeholder: "Ask a viva question…",                        submit: "Viva"   },
  { key: "quiz",     label: "Quiz",    placeholder: "Enter a topic (e.g. Portal hypertension)…",   submit: "Quiz"   },
];

export default function ChatInput({ value, onChange, onSubmit, disabled, mode, onModeChange }: ChatInputProps) {
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

  const current = MODES.find((m) => m.key === mode) ?? MODES[0];

  return (
    <div
      className="px-3 py-3 sm:px-4"
      style={{
        backgroundColor: "var(--papyrus)",
        borderTop: "1px solid var(--papyrus-border)",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => !disabled && onModeChange(m.key)}
            disabled={disabled}
            className="px-3 py-1 rounded-full font-serif text-xs transition-colors disabled:opacity-40"
            style={
              mode === m.key
                ? { backgroundColor: "var(--ink)", color: "var(--papyrus)" }
                : { backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)", color: "var(--ink-muted)" }
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input container */}
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
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, 2000))}
            onKeyDown={handleKeyDown}
            placeholder={current.placeholder}
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
          {current.submit}
        </button>
      </div>
    </div>
  );
}
