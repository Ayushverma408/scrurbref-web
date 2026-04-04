"use client";

import { createContext, useContext, useState } from "react";

interface ThreadContextValue {
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  isNavigating: boolean;
  setIsNavigating: (v: boolean) => void;
}

const ThreadContext = createContext<ThreadContextValue>({
  activeThreadId: null,
  setActiveThreadId: () => {},
  isNavigating: false,
  setIsNavigating: () => {},
});

export function ThreadProvider({ children }: { children: React.ReactNode }) {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  return (
    <ThreadContext.Provider value={{ activeThreadId, setActiveThreadId, isNavigating, setIsNavigating }}>
      {children}
    </ThreadContext.Provider>
  );
}

export function useThread() {
  return useContext(ThreadContext);
}
