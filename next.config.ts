import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev indicator sits over the sidebar's Sign out button and the demo runs on `next dev`;
  // compile/runtime errors still show as overlays
  devIndicators: false,
};

export default nextConfig;
