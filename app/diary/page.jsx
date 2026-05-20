import Link from "next/link";

export const metadata = {
  title: "日记分享 - 个人主页"
};

export default function DiaryPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Diary</div>
        <h1>日记分享</h1>
        <p className="subtitle">记录一些学习、生活和搭建网站过程中的想法。</p>
      </section>

      <section className="timeline">
        <article className="timeline-item">
          <time>2026-05-19</time>
          <h2>把站点整理成个人主页</h2>
          <p>今天把页面整理成更像个人博客的结构，新增了个人简介、作品集、日记和留言板。</p>
        </article>

        <article className="timeline-item">
          <time>2026-05-18</time>
          <h2>第一次整理静态网页</h2>
          <p>从一个简单的 HTML 页面开始，逐步拆出页面、样式、脚本和资源目录。</p>
        </article>
      </section>

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}
