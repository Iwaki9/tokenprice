import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/", destination: "/ru", permanent: false },
      { source: "/models/:path*", destination: "/ru/models/:path*", permanent: false },
      { source: "/providers/:path*", destination: "/ru/providers/:path*", permanent: false },
      { source: "/compare", destination: "/ru/compare", permanent: false },
      { source: "/check", destination: "/ru/check", permanent: false },
      { source: "/submit", destination: "/ru/submit", permanent: false },
      { source: "/blog/:path*", destination: "/ru/blog/:path*", permanent: false },
      { source: "/methodology", destination: "/ru/methodology", permanent: false },
      { source: "/admin", destination: "/ru/admin", permanent: false },
      { source: "/admin/:path*", destination: "/ru/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
