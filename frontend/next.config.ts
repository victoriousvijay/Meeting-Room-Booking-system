import type { NextConfig } from "next";

// The marketing page is its own project (landing/ in this repo), so the app's
// root just sends visitors there. Every other path is the app itself.
const LANDING_URL = process.env.LANDING_URL ?? "https://roomsync-landing.vercel.app";

const nextConfig: NextConfig = {
  redirects() {
    return [{ source: "/", destination: LANDING_URL, permanent: false }];
  },
};

export default nextConfig;
