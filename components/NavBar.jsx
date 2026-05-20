"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "首页", match: (pathname) => pathname === "/" },
  { href: "/about", label: "个人简介", match: (pathname) => pathname === "/about" },
  { href: "/portfolio", label: "作品集", match: (pathname) => pathname.startsWith("/portfolio") },
  { href: "/diary", label: "日记分享", match: (pathname) => pathname === "/diary" },
  { href: "/messages", label: "留言板", match: (pathname) => pathname === "/messages" },
  { href: "/stats", label: "访问统计", match: (pathname) => pathname === "/stats" },
  { href: "/nailong", label: "奶龙表情包", match: (pathname) => pathname === "/nailong" }
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="navbar" aria-label="页面导航">
      <Link className="logo" href="/">
        个人主页
      </Link>
      <div className="nav-links">
        {links.map((link) => (
          <Link key={link.href} className={link.match(pathname) ? "active" : undefined} href={link.href}>
            {link.label}
          </Link>
        ))}
        <a href="https://ys.mihoyo.com/main/" data-genshin-download>
          原神下载
        </a>
        <a href="https://github.com/digitalyang/webtest" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </div>
    </nav>
  );
}
