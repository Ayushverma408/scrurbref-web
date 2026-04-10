import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE = process.env.API_URL ?? "http://localhost:3001";

export async function POST(request: NextRequest) {
  const body       = await request.text();
  const authHeader = request.headers.get("Authorization");

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/quiz/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
      cache: "no-store",
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "RAG API unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache",
      "Connection":      "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
