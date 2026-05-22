import Link from "next/link";
import manifest from "../../public/assets/data/portfolio.json";
import PortfolioTabs from "../../components/portfolio/PortfolioTabs";
import { getRequestContext } from "../../lib/server/cloudflare";
import { getMergedPortfolioData } from "../../lib/server/portfolio-admin";

export const metadata = {
  title: "作品集 - DigitalSheep's Space"
};

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const portfolio = await getPublicPortfolioData();

  return (
    <>
      <section className="hero">
        <div className="badge">Portfolio</div>
        <h1>作品集</h1>
        <p className="subtitle">摄影、代码项目与手绘作品。</p>
      </section>

      <PortfolioTabs categories={portfolio.categories} photographyWorks={portfolio.photographyWorks} projects={portfolio.projects} />

      <footer>
        <p>
          <Link href="/">返回首页</Link>
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
