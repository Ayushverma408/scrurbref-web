"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const BOOKS = [
  "Fischer's Mastery 8th",
  "Sabiston 22nd",
  "Shackelford's 9th",
  "Blumgart's HPB",
];

const FEATURES = [
  "Searches all four books simultaneously — one query, four sources.",
  "Every answer cites the exact book and page. No unsourced claims.",
  "Relevant figures and diagrams retrieved alongside the text.",
  "Works on mobile. Useful between rounds.",
];

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
    <path d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.332 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 19.001 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.315 0-9.83-3.417-11.388-8.083l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
    <path d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.012 35.245 44 30 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState("");
  const [contactSent, setContactSent] = useState(false);
  const [contactSending, setContactSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    setContactSending(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const { error: insertError } = await supabase.from("referral_interest").insert({
      phone: contact.trim(),
      user_id: session?.user?.id ?? null,
    });
    setContactSending(false);
    if (insertError) {
      alert("Something went wrong saving your details. Please email me directly at ayushverma462002@gmail.com");
      console.error("referral_interest insert failed:", insertError);
      return;
    }
    setContactSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-papyrus px-4 py-12">
      <div className="w-full max-w-md md:max-w-4xl">
        <div className="md:grid md:grid-cols-2 md:gap-12 md:items-center">

          {/* Left panel */}
          <div className="mb-8 md:mb-0">
            <div className="mb-6 flex items-center gap-3">
              <img src="/logo-192.png" alt="ScrubRef" className="w-12 h-12 rounded-full" />
              <div>
                <h1 className="font-serif text-3xl font-semibold text-ink">ScrubRef</h1>
                <p className="font-serif text-ink-muted text-sm italic">Surgical knowledge, instantly.</p>
              </div>
            </div>

            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-ink leading-snug mb-3">
              The textbooks. Searchable. Cited.
            </h2>

            <p className="font-serif text-sm text-ink-muted italic mb-6 leading-relaxed">
              Ask any surgical question. Get an answer citing the exact page from Fischer, Sabiston, Shackelford, or Blumgart.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {BOOKS.map((book) => (
                <span
                  key={book}
                  className="font-serif text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: "var(--papyrus-light)",
                    border: "1px solid var(--papyrus-border)",
                    color: "var(--ink-muted)",
                  }}
                >
                  {book}
                </span>
              ))}
            </div>

            <ul className="space-y-3">
              {FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="font-serif text-sm"
                  style={{
                    borderLeft: "2px solid var(--accent)",
                    paddingLeft: "0.75rem",
                    color: "var(--ink-muted)",
                  }}
                >
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Right panel — form card */}
          <div>
            <div
              className="rounded-2xl p-8"
              style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
            >
              <h2 className="font-serif text-xl font-semibold text-ink mb-6">Welcome back</h2>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback` },
                  });
                }}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-sm font-serif font-medium transition-colors mb-4"
                style={{ backgroundColor: "var(--papyrus)", border: "1px solid var(--papyrus-border)", color: "var(--ink)" }}
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--papyrus-border)" }} />
                <span className="font-serif text-xs text-ink-faint">or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--papyrus-border)" }} />
              </div>

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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-serif text-sm font-medium text-ink">Password</label>
                    <Link href="/forgot-password" className="font-serif text-xs text-ink-muted hover:text-ink transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
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
                  className="w-full py-2.5 rounded-lg text-sm font-serif font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <p className="mt-6 text-center font-serif text-sm text-ink-muted">
                No account?{" "}
                <Link href="/signup" className="font-medium text-ink hover:underline">
                  Sign up free
                </Link>
              </p>
            </div>
          </div>

        </div>

        {/* Ambassador ask */}
        <div
          className="mt-10 rounded-2xl px-6 py-5 md:max-w-sm mx-auto"
          style={{ backgroundColor: "var(--papyrus-light)", border: "1px solid var(--papyrus-border)" }}
        >
          {contactSent ? (
            <p className="font-serif text-sm text-ink text-center">
              Got it — I'll reach out soon. Thanks. :)
            </p>
          ) : (
            <>
              <p className="font-serif text-sm font-semibold text-ink mb-1">
                Know people who should be using this?
              </p>
              <p className="font-serif text-xs text-ink-muted mb-4 leading-relaxed">
                If you can help spread the word, drop your number or email — I'll reach out. We'll make it worth your while. :)
              </p>
              <form onSubmit={handleContactSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="WhatsApp number or email"
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-serif text-ink bg-papyrus outline-none"
                  style={{ border: "1px solid var(--papyrus-border)" }}
                />
                <button
                  type="submit"
                  disabled={contactSending || !contact.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-serif font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "var(--ink)", color: "var(--papyrus)" }}
                >
                  {contactSending ? "…" : "I'm in"}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
