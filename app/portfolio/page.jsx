import Link from "next/link";
import manifest from "../../public/assets/data/portfolio.json";
import PortfolioTabs from "../../components/portfolio/PortfolioTabs";

export const metadata = {
  title: "作品集 - 个人主页"
};

export default function PortfolioPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Portfolio</div>
        <h1>作品集</h1>
        <p className="subtitle">摄影、代码项目与手绘作品。</p>
      </section>

      <PortfolioTabs categories={manifest.categories} photographyWorks={manifest.photographyWorks} projects={manifest.projects} />

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}
