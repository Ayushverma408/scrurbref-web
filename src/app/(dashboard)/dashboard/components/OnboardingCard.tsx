"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const SPECIALTIES = [
  "MS General Surgery",
  "MCh HPB Surgery",
  "MCh GI Surgery",
  "MCh Paediatric Surgery",
  "MCh Urology",
  "MCh Cardiothoracic Surgery",
  "MCh Vascular Surgery",
  "DNB Surgery",
  "Other / Consultant",
];

const TRAINING_YEARS = ["JR1", "JR2", "JR3", "Senior Resident", "Fellow", "Consultant"];

const DEPTH_OPTIONS = [
  {
    id: "concise",
    label: "Precise & concise",
    icon: "🎯",
    description: "Key facts and steps only. No extra context.",
  },
  {
    id: "balanced",
    label: "Balanced",
    icon: "⚖️",
    description: "Core answer with enough context to understand it.",
  },
  {
    id: "comprehensive",
    label: "Full depth",
    icon: "📖",
    description: "Explain everything — concepts, anatomy, physiology, reasoning.",
  },
];

const TONE_OPTIONS = [
  {
    id: "textbook",
    label: "Textbook strict",
    icon: "📚",
    description: "Grounded strictly in what the books say. Minimal editorialising.",
  },
  {
    id: "teaching",
    label: "Teaching style",
    icon: "🗣️",
    description: "Explains the why, not just the what. Like a senior explaining at the table.",
  },
];

const RESTRICTIVENESS_OPTIONS = [
  {
    id: "strict",
    label: "By the book",
    icon: "🔒",
    description: "Only what the four textbooks say. No outside knowledge.",
  },
  {
    id: "guided",
    label: "Guided",
    icon: "🔀",
    description: "Textbooks first. Fills gaps with surgical knowledge when needed.",
  },
  {
    id: "open",
    label: "Full knowledge",
    icon: "🧠",
    description: "Draws on everything. Textbooks + broad surgical expertise.",
  },
];

function generateProfilePrompt(
  specialty: string,
  year: string,
  depth: string,
  tone: string
): string {
  const levelContext: Record<string, string> = {
    JR1: "I am building foundational knowledge in surgical anatomy, basic operative steps, and perioperative care.",
    JR2: "I am developing operative skills and deepening my understanding of surgical technique and anatomical landmarks.",
    JR3: "I am consolidating advanced operative knowledge and preparing for surgical exit examinations.",
    "Senior Resident": "I am at a senior level, focusing on complex cases, operative decision-making, and exam preparation.",
    Fellow: "I have completed core surgical training and am focusing on advanced subspecialty technique and evidence-based practice.",
    Consultant: "I am a practising consultant looking up specific operative details, anatomy, and textbook references.",
  };

  const bookContext: Record<string, string> = {
    "MCh HPB Surgery": "I rely heavily on Blumgart's HPB Surgery and Fischer's Mastery of Surgery.",
    "MCh GI Surgery": "I rely on Shackelford's Surgery of the Alimentary Tract and Fischer's Mastery of Surgery.",
    "MCh Vascular Surgery": "I rely on Fischer's Mastery of Surgery for vascular anatomy and technique.",
    "MCh Cardiothoracic Surgery": "I use Fischer's Mastery of Surgery for thoracic surgical references.",
    default: "I study primarily from Fischer's Mastery of Surgery, Sabiston, Shackelford, and Blumgart.",
  };

  const depthInstruction: Record<string, string> = {
    concise: "Keep answers precise and concise — key facts, operative steps, and citations only. Do not elaborate beyond what is asked.",
    balanced: "Provide a well-rounded answer with core detail and enough context to understand the clinical reasoning. Cite textbook pages.",
    comprehensive: "Give a comprehensive, deeply explanatory answer. Cover the underlying anatomy, physiology, and surgical reasoning fully. Explain concepts as if teaching — the longer and more thorough, the better. Always cite textbook pages.",
  };

  const toneInstruction: Record<string, string> = {
    textbook: "Stay strictly grounded in textbook content. Avoid editorialising — report what Fischer, Sabiston, Shackelford, or Blumgart say.",
    teaching: "Use a teaching tone — explain why things are done, not just what. Think of the style of a senior surgeon explaining at the operating table.",
  };

  const level = levelContext[year] ?? levelContext["JR2"];
  const books = bookContext[specialty] ?? bookContext["default"];
  const depthInstr = depthInstruction[depth] ?? depthInstruction["balanced"];
  const toneInstr = toneInstruction[tone] ?? toneInstruction["teaching"];

  return `I am a ${year} in ${specialty}. ${level} ${books}\n\n${depthInstr} ${toneInstr}`;
}

interface OnboardingCardProps {
  onComplete: () => void;
}

type Step = "specialty" | "year" | "style" | "prompt";

export default function OnboardingCard({ onComplete }: OnboardingCardProps) {
  const [step, setStep] = useState<Step>("specialty");
  const [specialty, setSpecialty] = useState("");
  const [year, setYear] = useState("");
  const [depth, setDepth] = useState("");
  const [tone, setTone] = useState("");
  const [restrictiveness, setRestrictiveness] = useState("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  function handleSpecialtySelect(s: string) {
    setSpecialty(s);
    setStep("year");
  }

  function handleYearSelect(y: string) {
    setYear(y);
    setStep("style");
  }

  function handleStyleContinue() {
    // Use defaults for anything not selected
    const d = depth || "balanced";
    const t = tone || "teaching";
    const r = restrictiveness || "guided";
    setDepth(d);
    setTone(t);
    setRestrictiveness(r);
    setPrompt(generateProfilePrompt(specialty, year, d, t));
    setStep("prompt");
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: {
        specialty,
        training_year: year,
        answer_depth: depth,
        answer_tone: tone,
        answer_restrictiveness: restrictiveness,
        profile_prompt: prompt,
      },
    });
    setSaving(false);
    onComplete();
  }

  const stepNumber: Record<Step, string> = {
    specialty: "Step 1 of 4",
    year: "Step 2 of 4",
    style: "Step 3 of 4",
    prompt: "Step 4 of 4",
  };

  return (
    <div className="flex flex-col items-center justify-start md:justify-center h-full px-4 py-8 md:px-6 md:py-16 overflow-y-auto">
      <div
        className="w-full max-w-xl rounded-2xl p-8"
        style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
      >
        <p className="font-serif text-xs uppercase tracking-widest text-ink-faint mb-2">
          {stepNumber[step]}
        </p>

        {/* ── Step 1: Specialty ── */}
        {step === "specialty" && (
          <>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-2">
              Welcome to ScrubRef.
            </h2>
            <p className="font-serif text-ink-muted text-base mb-6">
              Tell us your specialty so we can tailor answers to what matters for you.
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => (
                <StyleChip key={s} label={s} selected={false} onClick={() => handleSpecialtySelect(s)} />
              ))}
            </div>
            <button onClick={() => setStep("year")} className="mt-4 text-xs font-serif text-ink-faint hover:text-ink-muted transition-colors">
              Skip →
            </button>
          </>
        )}

        {/* ── Step 2: Training year ── */}
        {step === "year" && (
          <>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-1">
              Where are you in your training?
            </h2>
            <p className="font-serif text-ink-muted text-sm mb-6 italic">{specialty}</p>
            <div className="flex flex-wrap gap-2">
              {TRAINING_YEARS.map((y) => (
                <StyleChip key={y} label={y} selected={false} onClick={() => handleYearSelect(y)} />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <BackButton onClick={() => setStep("specialty")} />
              <button onClick={() => setStep("style")} className="text-xs font-serif text-ink-faint hover:text-ink-muted transition-colors">
                Skip →
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Answer style ── */}
        {step === "style" && (
          <>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-1">
              How do you like your answers?
            </h2>
            <p className="font-serif text-ink-muted text-sm mb-6">
              This shapes every response you get. You can change it later in Settings.
            </p>

            {/* Depth */}
            <p className="font-serif text-xs uppercase tracking-widest text-ink-faint mb-2">
              Answer depth
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
              {DEPTH_OPTIONS.map((opt) => (
                <StyleCard
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.description}
                  selected={depth === opt.id}
                  onClick={() => setDepth(opt.id)}
                />
              ))}
            </div>

            {/* Tone */}
            <p className="font-serif text-xs uppercase tracking-widest text-ink-faint mb-2">
              Answer tone
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 mb-5">
              {TONE_OPTIONS.map((opt) => (
                <StyleCard
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.description}
                  selected={tone === opt.id}
                  onClick={() => setTone(opt.id)}
                />
              ))}
            </div>

            {/* Restrictiveness */}
            <p className="font-serif text-xs uppercase tracking-widest text-ink-faint mb-2">
              Knowledge source
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
              {RESTRICTIVENESS_OPTIONS.map((opt) => (
                <StyleCard
                  key={opt.id}
                  icon={opt.icon}
                  label={opt.label}
                  description={opt.description}
                  selected={restrictiveness === opt.id}
                  onClick={() => setRestrictiveness(opt.id)}
                />
              ))}
            </div>

            <button
              onClick={handleStyleContinue}
              className="w-full py-2.5 rounded-lg text-sm font-serif font-medium transition-colors mb-2"
              style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
            >
              Continue →
            </button>
            <BackButton onClick={() => setStep("year")} />
          </>
        )}

        {/* ── Step 4: Review & edit prompt ── */}
        {step === "prompt" && (
          <>
            <h2 className="font-serif text-2xl font-semibold text-ink mb-2">
              We wrote this for you.
            </h2>
            <p className="font-serif text-ink-muted text-sm mb-4">
              This is sent with every question to personalise your answers. Edit it however you like — add exam goals, areas of focus, anything.
            </p>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl text-sm font-serif text-ink leading-relaxed outline-none resize-none"
              style={{
                backgroundColor: "var(--papyrus)",
                border: "1px solid var(--papyrus-border)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ink-muted)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--papyrus-border)")}
            />

            <p className="text-xs font-serif text-ink-faint mt-2 mb-5">
              You can always edit this in ⚙︎ Settings.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-serif font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
              >
                {saving ? "Saving…" : "Start using ScrubRef →"}
              </button>
              <BackButton onClick={() => setStep("style")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StyleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg text-sm font-serif transition-colors"
      style={{
        backgroundColor: selected ? "var(--ink)" : "var(--papyrus)",
        border: `1px solid ${selected ? "var(--ink)" : "var(--papyrus-border)"}`,
        color: selected ? "var(--papyrus)" : "var(--ink-muted)",
      }}
    >
      {label}
    </button>
  );
}

function StyleCard({
  icon, label, description, selected, onClick,
}: {
  icon: string;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-1 px-3 py-3 rounded-xl text-left transition-all"
      style={{
        backgroundColor: selected ? "var(--ink)" : "var(--papyrus)",
        border: `1.5px solid ${selected ? "var(--ink)" : "var(--papyrus-border)"}`,
        color: selected ? "var(--papyrus)" : "var(--ink)",
      }}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-serif text-sm font-semibold leading-tight">{label}</span>
      <span
        className="font-serif text-xs leading-snug"
        style={{ color: selected ? "var(--papyrus-light)" : "var(--ink-muted)" }}
      >
        {description}
      </span>
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 text-xs font-serif text-ink-faint hover:text-ink-muted transition-colors"
    >
      ← Back
    </button>
  );
}
