import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE = process.env.API_URL ?? "http://localhost:3001";

/**
 * POST /demo/stream
 * Unauthenticated streaming proxy. Same pattern as /query/stream/route.ts —
 * streams the ReadableStream body directly without buffering.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/demo/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  const remaining = upstream.headers.get("X-Demo-Remaining");

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      ...(remaining ? { "X-Demo-Remaining": remaining } : {}),
    },
  });
}
