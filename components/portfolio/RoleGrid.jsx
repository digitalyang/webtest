import Link from "next/link";
import { getRoleHref, resolveImageSrc } from "../../lib/portfolio";

export default function RoleGrid({ work }) {
  const roles = work?.roles || [];

  if (!roles.length) {
    return <p className="muted">这个作品暂时没有角色。</p>;
  }

  return (
    <div className="portfolio-grid portfolio-role-grid">
      {roles.map((role, index) => (
        <Link key={role.id} className="portfolio-thumb portfolio-role-card" href={getRoleHref(role.id)}>
          <img
            src={resolveImageSrc(role.coverThumb)}
            alt={`${work.title} ${role.title} 封面`}
            loading={index === 0 ? "eager" : "lazy"}
            width="480"
            height="360"
            fetchPriority={index === 0 ? "high" : undefined}
          />
          <span className="portfolio-card-text">
            <strong>{role.title}</strong>
            <small>{role.imageCount} 张图片</small>
          </span>
        </Link>
      ))}
    </div>
  );
}
