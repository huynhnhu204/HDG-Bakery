/** @type {import('next').NextConfig} */
const rawBackend =
  process.env.BACKEND_REWRITE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://127.0.0.1:8000";
const backendBase = String(rawBackend).replace(/\/+$/, "");

function backendImagePattern() {
  try {
    const u = new URL(
      backendBase.includes("://") ? backendBase : `http://${backendBase}`,
    );
    const protocol = u.protocol === "https:" ? "https" : "http";
    const entry = {
      protocol,
      hostname: u.hostname,
      pathname: "/**",
    };
    if (u.port) entry.port = u.port;
    return entry;
  } catch {
    return null;
  }
}

const baseRemotePatterns = [
  { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/**" },
  { protocol: "http", hostname: "localhost", port: "8000", pathname: "/**" },
  { protocol: "https", hostname: "bizweb.dktcdn.net", pathname: "/**" },
  { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
];

const prodBackend = backendImagePattern();
const remotePatterns =
  prodBackend &&
  prodBackend.hostname !== "127.0.0.1" &&
  prodBackend.hostname !== "localhost"
    ? [...baseRemotePatterns, prodBackend]
    : baseRemotePatterns;

const nextConfig = {
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendBase}/api/:path*` },
      { source: "/uploads/:path*", destination: `${backendBase}/uploads/:path*` },
      { source: "/storage/:path*", destination: `${backendBase}/storage/:path*` },
    ];
  },
};
export default nextConfig;
