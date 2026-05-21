import Link from "next/link";
import manifest from "../../../../public/assets/data/portfolio.json";
import RoleImageLoader from "../../../../components/portfolio/RoleImageLoader";
import { findRoleById, getWorkHref, withoutThumbnails } from "../../../../lib/portfolio";
import { getRequestContext } from "../../../../lib/server/cloudflare";
import { getMergedPortfolioData } from "../../../../lib/server/portfolio-admin";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return manifest.photographyWorks.flatMap((work) =>
    work.roles.map((role) => ({
      roleId: role.id
    }))
  );
}

export async function generateMetadata({ params }) {
  const { roleId } = await params;
  const result = findRoleById(manifest, roleId);

  return {
    title: `${result ? `${result.work.title} · ${result.role.title}` : "角色图片"} - 个人主页`
  };
}

export default async function PortfolioRolePage({ params }) {
  const { roleId } = await params;
  const portfolio = await getPublicPortfolioData();
  const result = findRoleById(portfolio, roleId);

  if (!result) {
    return (
      <>
        <section className="hero">
          <div className="badge">Portfolio</div>
          <h1>角色图片</h1>
          <p className="subtitle">原图每次加载 5 张。</p>
        </section>
        <div className="portfolio-app" aria-live="polite">
          <p className="muted">没有找到这个角色。</p>
          <p className="muted">
            <Link href="/portfolio">返回作品集</Link>
          </p>
        </div>
      </>
    );
  }

  const { work, role } = result;
  const images = withoutThumbnails(role.images);

  return (
    <>
      <section className="hero">
        <div className="badge">Portfolio</div>
        <h1>
          {work.title} · {role.title}
        </h1>
        <p className="subtitle">{images.length} 张原图，每次加载 5 张。</p>
      </section>

      <div className="portfolio-app" aria-live="polite">
        <RoleImageLoader images={images} />
      </div>

      <footer>
        <p>
          <Link id="backToWorkLink" href={getWorkHref(work.id)}>
            返回 {work.title}
          </Link>
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
