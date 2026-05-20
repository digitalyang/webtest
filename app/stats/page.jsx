import Link from "next/link";
import StatsPanel from "../../components/StatsPanel";

export const metadata = {
  title: "访问统计 - 个人主页"
};

export default function StatsPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Analytics</div>
        <h1>访问统计</h1>
        <p className="subtitle">通过 Cloudflare D1 记录页面访问数据。</p>
      </section>

      <StatsPanel />

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}
