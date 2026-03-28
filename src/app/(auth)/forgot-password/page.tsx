"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback?type=recovery`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-papyrus px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/login" className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo-192.png" alt="ScrubRef" className="w-10 h-10 rounded-full" />
            <span className="font-serif text-3xl font-semibold text-ink">ScrubRef</span>
          </Link>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
        >
          {done ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="font-serif text-xl font-semibold text-ink mb-2">Check your email</h2>
              <p className="font-serif text-sm text-ink-muted leading-relaxed">
                We sent a password reset link to{" "}
                <strong className="text-ink">{email}</strong>. Click it to set a new password.
              </p>
              <p className="mt-4 font-serif text-xs text-ink-faint">
                Didn't get it? Check your spam folder.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-serif text-xl font-semibold text-ink mb-1">Reset your password</h2>
              <p className="font-serif text-sm text-ink-muted italic mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-serif text-sm font-medium text-ink mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center font-serif text-sm text-ink-muted">
            <Link href="/login" className="font-medium text-ink hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
