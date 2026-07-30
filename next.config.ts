import type { NextConfig } from "next";

// No nonces: this app relies on next/font self-hosting, a cached server-rendered
// theme <style> tag (`(app)/layout.tsx`) and no CSP-sensitive third-party scripts,
// so the "static" CSP form from the Next.js docs applies cleanly. Nonces would force
// every page into dynamic rendering, which conflicts with the deliberately cached
// site palette (see PROJECT_PASSPORT.md section 4, "Caching").
const isDev = process.env.NODE_ENV === "development";
// `NODE_ENV === "production"` only means "optimized build" — `next start` sets
// it locally too, over plain HTTP. Vercel is the only environment where this
// app is actually served over real HTTPS, and it sets `VERCEL=1`. Gating on
// that instead of `isDev` covers `next start` run locally as well.
const isServedOverHttps = process.env.VERCEL === "1";

// Origins the browser talks to directly (not proxied through a Route Handler):
// LiveKit for video/realtime-text signaling, and three CDNs whose images render
// via plain <img> tags rather than next/image (avatars, Google avatars, flags).
const cspDirectives = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: https://res.cloudinary.com https://lh3.googleusercontent.com https://flagcdn.com`,
  `font-src 'self'`,
  `connect-src 'self' wss://*.livekit.cloud https://*.livekit.cloud`,
  `media-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  // NextAuth's Google sign-in submits a same-origin form and is then redirected
  // to Google's login page; accounts.google.com is allowed in case a browser
  // enforces form-action against the final redirect target.
  `form-action 'self' https://accounts.google.com`,
  `frame-ancestors 'none'`,
  // Plain HTTP (dev, or `next start` run locally) has nothing answering on
  // https: for the same port, so upgrading every asset request to https:
  // fails outright — the entire app renders unstyled with a wall of
  // ERR_SSL_PROTOCOL_ERROR in the console. Only include this on Vercel,
  // where the app is actually served over real HTTPS and it's a no-op.
  ...(isServedOverHttps ? [`upgrade-insecure-requests`] : []),
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Superseded by frame-ancestors above, kept for older browsers.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // camera/microphone stay enabled (self only) because the pre-join screen and
  // video sessions need getUserMedia; geolocation and Topics are unused.
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // No `preload` — that requires manual submission to browsers' HSTS preload
  // list and is effectively irreversible; not this block's call to make.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
