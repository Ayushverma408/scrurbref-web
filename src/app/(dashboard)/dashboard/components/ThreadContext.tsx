"use client";

import { createContext, useContext, useState } from "react";

interface ThreadContextValue {
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
}

const ThreadContext = createContext<ThreadContextValue>({
  activeThreadId: null,
  setActiveThreadId: () => {},
});

export function ThreadProvider({ children }: { children: React.ReactNode }) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  return (
    <ThreadContext.Provider value={{ activeThreadId, setActiveThreadId }}>
      {children}
    </ThreadContext.Provider>
  );
}

export function useThread() {
  return useContext(ThreadContext);
}
