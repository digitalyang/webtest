"use client";

import { useEffect, useState } from "react";

export default function StatsPanel() {
  const [stats, setStats] = useState({ total: "-", today: "-", pages: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "统计加载失败。");
        }

        setStats({
          total: data.total,
          today: data.today,
          pages: data.pages || []
        });
        setError("");
      } catch (loadError) {
        setError(loadError.message);
      }
    }

    loadStats();
  }, []);

  return (
    <>
      <section className="stat-grid">
        <article className="stat-card">
          <span>总访问量</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="stat-card">
          <span>今日访问量</span>
          <strong>{stats.today}</strong>
        </article>
      </section>

      <section className="panel-list" aria-live="polite">
        {error ? <p className="empty-state">{error}</p> : null}
        {!error && stats.pages.length === 0 ? <p className="empty-state">还没有访问记录。</p> : null}
        {!error
          ? stats.pages.map((page) => (
              <article className="stat-row" key={page.path}>
                <span>{page.path}</span>
                <strong>{page.count}</strong>
              </article>
            ))
          : null}
      </section>
    </>
  );
}
