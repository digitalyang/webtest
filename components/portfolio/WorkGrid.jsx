import Link from "next/link";
import { getWorkHref, resolveImageSrc } from "../../lib/portfolio";

export default function WorkGrid({ works = [] }) {
  if (!works.length) {
    return <p className="muted">暂无摄影作品</p>;
  }

  return (
    <div className="portfolio-grid portfolio-work-grid">
      {works.map((work, index) => (
        <Link key={work.id} className="portfolio-thumb portfolio-work-card" href={getWorkHref(work.id)}>
          <img
            src={resolveImageSrc(work.coverThumb)}
            alt={`${work.title} 封面`}
            loading={index === 0 ? "eager" : "lazy"}
            width="480"
            height="360"
            fetchPriority={index === 0 ? "high" : undefined}
          />
          <span className="portfolio-card-text">
            <strong>{work.title}</strong>
            <small>
              {work.roleCount} 个角色 / {work.imageCount} 张图片
            </small>
          </span>
        </Link>
      ))}
    </div>
  );
}
