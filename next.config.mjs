import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imgs.qiubiaoqing.com"
      }
    ]
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/pages/about.html", destination: "/about", permanent: true },
      { source: "/pages/portfolio.html", destination: "/portfolio", permanent: true },
      { source: "/pages/diary.html", destination: "/diary", permanent: true },
      { source: "/pages/messages.html", destination: "/messages", permanent: true },
      { source: "/pages/stats.html", destination: "/stats", permanent: true },
      { source: "/pages/nailong.html", destination: "/nailong", permanent: true },
      { source: "/pages/genshin.html", destination: "/genshin", permanent: true }
    ];
  }
};

export default nextConfig;

initOpenNextCloudflareForDev();
