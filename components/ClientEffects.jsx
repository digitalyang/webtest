"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { detectGenshinPlatform, genshinDownloadLinks } from "../lib/genshin";
import { useToast } from "./ToastProvider";

function createClickStar(event) {
  const star = document.createElement("span");
  const size = Math.floor(Math.random() * 20) + 14;

  star.className = "click-star";
  star.style.left = `${event.clientX}px`;
  star.style.top = `${event.clientY}px`;
  star.style.setProperty("--star-size", `${size}px`);
  star.style.setProperty("--star-rotation", `${Math.floor(Math.random() * 72) - 36}deg`);
  star.innerHTML = `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2.5l3.9 8 8.8 1.3-6.4 6.2 1.5 8.8L16 22.6 8.2 26.8 9.7 18l-6.4-6.2 8.8-1.3z" fill="currentColor"></path>
    </svg>
  `;

  document.body.appendChild(star);
  star.addEventListener("animationend", () => {
    star.remove();
  });
}

function trackPageView() {
  const payload = JSON.stringify({
    path: window.location.pathname,
    title: document.title,
    referrer: document.referrer
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/stats", new Blob([payload], { type: "application/json" }));
    return;
  }

  fetch("/api/stats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

export default function ClientEffects() {
  const showToast = useToast();
  const pathname = usePathname();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const downloadInfo = genshinDownloadLinks[detectGenshinPlatform()];

    document.querySelectorAll("[data-genshin-download]").forEach((link) => {
      link.href = downloadInfo.url;
      link.dataset.toast = downloadInfo.tip;

      if (link.dataset.genshinLabel === "auto") {
        link.textContent = downloadInfo.label;
      }

      if (downloadInfo.directDownload) {
        link.setAttribute("download", "");
      } else {
        link.removeAttribute("download");
      }
    });
    trackPageView();
  }, [pathname]);

  useEffect(() => {
    function handleToastClick(event) {
      const target = event.target.closest("[data-toast]");
      if (target?.dataset.toast) {
        showToast(target.dataset.toast);
      }
    }

    document.addEventListener("click", handleToastClick);
    document.addEventListener("click", createClickStar);

    return () => {
      document.removeEventListener("click", handleToastClick);
      document.removeEventListener("click", createClickStar);
    };
  }, [showToast]);

  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 420);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      className={`back-to-top${showBackToTop ? " is-visible" : ""}`}
      type="button"
      aria-label="回到顶部"
      onClick={scrollToTop}
    >
      <span aria-hidden="true">🚀</span>
    </button>
  );
}
