import Link from "next/link";
import manifest from "../../../../public/assets/data/portfolio.json";
import RoleGrid from "../../../../components/portfolio/RoleGrid";
import { findWorkById } from "../../../../lib/portfolio";

export function generateStaticParams() {
  return manifest.photographyWorks.map((work) => ({
    workId: work.id
  }));
}

export function generateMetadata({ params }) {
  const work = findWorkById(manifest, params.workId);

  return {
    title: `${work?.title || "作品详情"} - 个人主页`
  };
}

export default function PortfolioWorkPage({ params }) {
  const work = findWorkById(manifest, params.workId);

  if (!work) {
    return (
      <>
        <section className="hero">
          <div className="badge">Portfolio</div>
          <h1>作品详情</h1>
          <p className="subtitle">选择角色查看图片。</p>
        </section>
        <div className="portfolio-app" aria-live="polite">
          <p className="muted">没有找到这个作品。</p>
          <p className="muted">
            <Link href="/portfolio">返回作品集</Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <section className="hero">
        <div className="badge">Portfolio</div>
        <h1>{work.title}</h1>
        <p className="subtitle">
          {work.roleCount} 个角色 / {work.imageCount} 张图片
        </p>
      </section>

      <div className="portfolio-app" aria-live="polite">
        <RoleGrid work={work} />
      </div>

      <footer>
        <p>
          <Link href="/portfolio">返回作品集</Link>
        </p>
      </footer>
    </>
  );
}
