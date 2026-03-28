"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";

interface Thread {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface Usage {
  daily:   { used: number; limit: number; reset: string };
  monthly: { used: number; limit: number; reset: string };
}

interface Props {
  userEmail: string;
  threads: Thread[];
  usage?: Usage | null;
}

export default function MobileNavWrapper({ userEmail, threads, usage }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg"
        style={{ backgroundColor: "var(--sidebar-bg)", color: "var(--sidebar-text)" }}
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
          <rect y="2"  width="18" height="2" rx="1" />
          <rect y="8"  width="18" height="2" rx="1" />
          <rect y="14" width="18" height="2" rx="1" />
        </svg>
      </button>

      {/* Backdrop — mobile only, closes sidebar on tap */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static column on desktop */}
      <div
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col h-full",
          "transition-transform duration-200 ease-in-out",
          "md:relative md:translate-x-0 md:shrink-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <Sidebar
          userEmail={userEmail}
          threads={threads}
          usage={usage}
          onCloseMobile={() => setOpen(false)}
        />
      </div>
    </>
  );
}
