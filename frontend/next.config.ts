import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright-extra", "puppeteer-extra-plugin-stealth", "playwright-core"],
};

export default nextConfig;
