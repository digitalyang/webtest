"use client";

import { renderMarkdown } from "../lib/message-markdown";

export default function DiaryEntries({ entries }) {
  if (!entries.length) {
    return (
      <section className="timeline">
        <article className="timeline-item">
          <p>暂时还没有日记。</p>
        </article>
      </section>
    );
  }

  return (
    <section className="timeline">
      {entries.map((entry) => (
        <article className="timeline-item" key={entry.id}>
          <time>{entry.entryDate}</time>
          <h2>{entry.title}</h2>
          <div className="diary-content markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.content) }} />
        </article>
      ))}
    </section>
  );
}
