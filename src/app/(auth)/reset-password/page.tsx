"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-papyrus px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo-192.png" alt="ScrubRef" className="w-10 h-10 rounded-full" />
            <span className="font-serif text-3xl font-semibold text-ink">ScrubRef</span>
          </div>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
        >
          <h2 className="font-serif text-xl font-semibold text-ink mb-1">Set a new password</h2>
          <p className="font-serif text-sm text-ink-muted italic mb-6">
            Choose something you'll remember.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-serif text-sm font-medium text-ink mb-1">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 rounded-lg text-sm font-serif text-ink bg-papyrus outline-none focus:ring-2 focus:ring-ink-muted"
                style={{ border: "1px solid var(--papyrus-border)" }}
              />
            </div>

            <div>
              <label className="block font-serif text-sm font-medium text-ink mb-1">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full px-3 py-2 rounded-lg text-sm font-serif text-ink bg-papyrus outline-none focus:ring-2 focus:ring-ink-muted"
                style={{ border: "1px solid var(--papyrus-border)" }}
              />
            </div>

            {error && (
              <p className="text-sm font-serif text-accent bg-papyrus rounded-lg px-3 py-2"
                style={{ border: "1px solid var(--accent)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-serif font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
            >
              {loading ? "Saving…" : "Set new password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
