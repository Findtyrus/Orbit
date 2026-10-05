import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones on the same Wi-Fi open the dev server (Mac's Bonjour name + private network IPs).
  allowedDevOrigins: ["tyruss-macbook-air.local", "*.local", "10.*.*.*", "192.168.*.*", "172.*.*.*"],
  experimental: {
    // LinkedIn "Complete" exports are a few MB zipped.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default nextConfig;
