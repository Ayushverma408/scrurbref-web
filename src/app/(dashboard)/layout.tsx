import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileNavWrapper from "./dashboard/components/MobileNavWrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch threads + usage from scrubref-api
  let threads: { id: string; title: string | null; updatedAt: string }[] = [];
  let usage: { daily: { used: number; limit: number; reset: string }; monthly: { used: number; limit: number; reset: string } } | null = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      const apiBase = process.env.API_URL ?? "http://localhost:3001";
      const [threadsRes, usageRes] = await Promise.all([
        fetch(`${apiBase}/threads`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch(`${apiBase}/query/usage`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      ]);
      if (threadsRes.ok) threads = await threadsRes.json();
      if (usageRes.ok) usage = await usageRes.json();
    }
  } catch {
    // API offline during dev — show empty sidebar
  }

  return (
    <div className="h-screen flex overflow-hidden bg-papyrus">
      <MobileNavWrapper userEmail={user!.email ?? ""} threads={threads} usage={usage} />

      <main className="flex-1 min-w-0 overflow-y-auto pt-12 md:pt-0">{children}</main>
    </div>
  );
}
