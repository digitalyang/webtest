import Link from "next/link";
import manifest from "../../../../public/assets/data/portfolio.json";
import RoleGrid from "../../../../components/portfolio/RoleGrid";
import { findWorkById } from "../../../../lib/portfolio";
import { getRequestContext } from "../../../../lib/server/cloudflare";
import { getMergedPortfolioData } from "../../../../lib/server/portfolio-admin";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return manifest.photographyWorks.map((work) => ({
    workId: work.id
  }));
}

export async function generateMetadata({ params }) {
  const { workId } = await params;
  const work = findWorkById(manifest, workId);

  return {
    title: `${work?.title || "作品详情"} - 个人主页`
  };
}

export default async function PortfolioWorkPage({ params }) {
  const { workId } = await params;
  const portfolio = await getPublicPortfolioData();
  const work = findWorkById(portfolio, workId);

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

async function getPublicPortfolioData() {
  const env = getOptionalRequestEnv();
  return getMergedPortfolioData(env, manifest);
}

function getOptionalRequestEnv() {
  try {
    return getRequestContext().env;
  } catch {
    return undefined;
  }
}
