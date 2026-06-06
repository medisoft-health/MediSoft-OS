import type { NextConfig } from "next";
import path from "node:path";
import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * MediSoft C-OS — Next.js configuration.
 *
 * Bundle analyzer is gated behind ANALYZE=1 so it never runs in normal
 * dev / CI / production builds. Generate a report with:
 *   ANALYZE=1 npm run analyze:webpack
 * which drops .next/analyze/{client,nodejs,edge}.html files.
 *
 * next-intl plugin wires up src/i18n/request.ts as the message loader.
 */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "1",
  openAnalyzer: false,
});
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  // Standalone output for Docker / Cloud Run deployments.
  // Produces a self-contained server.js with only the required node_modules.
  // output: "standalone", // Disabled - using next start with PM2

  // Allow dev HMR from the public IP (required when running dev mode behind Nginx).
  allowedDevOrigins: ["http://35.227.122.228", "35.227.122.228"],

  // Pin Turbopack to this project's root so it ignores stray lockfiles elsewhere
  // on the system (e.g. ~/package-lock.json from prior projects).
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Strict mode catches state-related bugs in dev.
  reactStrictMode: true,

  // Trust the brand assets we copied into public/brand at the appropriate size.
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Healthcare apps benefit from explicit security headers.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
            ].join("; "),
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
