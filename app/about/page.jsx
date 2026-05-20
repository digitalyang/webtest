import Link from "next/link";

export const metadata = {
  title: "个人简介 - 个人主页"
};

export default function AboutPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">About Me</div>
        <h1>个人简介</h1>
        <p className="subtitle">这里可以放你的经历、技能、兴趣方向和联系方式。</p>
      </section>

      <section className="panel">
        <h2>你好，我是 digitalyang</h2>
        <p>这是一个正在搭建中的个人静态网站。当前重点是把网站结构搭好，后续可以继续替换为真实的个人介绍、项目经验和联系方式。</p>
        <div className="info-list">
          <span>前端静态页面</span>
          <span>GitHub Pages</span>
          <span>个人博客</span>
          <span>自动化部署</span>
        </div>
      </section>

      <section className="card-grid">
        <article className="card">
          <div className="card-content">
            <h2>关注方向</h2>
            <p>网页工程、自动化工具、个人知识整理，以及把想法快速做成可访问页面。</p>
          </div>
        </article>
        <article className="card">
          <div className="card-content">
            <h2>网站目标</h2>
            <p>先做成可维护的静态个人站，再逐步扩展成博客、作品展示和资料归档。</p>
          </div>
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
