import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy all scrubref-api calls through the Next.js server.
  // NEXT_PUBLIC_API_URL is "" so fetch("/threads") etc. are rewritten
  // server-side to localhost:3001 — works in both dev and behind the
  // Cloudflare tunnel without exposing port 3001 publicly.
  async rewrites() {
    const apiBase = process.env.API_URL ?? "http://localhost:3001";
    return [
      { source: "/threads",        destination: `${apiBase}/threads` },
      { source: "/threads/:path*", destination: `${apiBase}/threads/:path*` },
      { source: "/query/:path*",   destination: `${apiBase}/query/:path*` },
      { source: "/demo/:path*",    destination: `${apiBase}/demo/:path*` },
      { source: "/page/:path*",    destination: `${apiBase}/page/:path*` },
      { source: "/images/:path*",  destination: `${apiBase}/images/:path*` },
    ];
  },
};

export default nextConfig;
