import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="badge">DigitalSheep</div>
        <h1>欢迎来到 DigitalSheep 的个人主页</h1>
        <p className="subtitle">不玩游戏不看动漫的嵌入式开发者不是一个好的摄影师。这里整理作品集、日记、留言板，以及一些折腾出来的小功能。</p>
        <div className="actions">
          <Link className="button" href="/about">
            了解我
          </Link>
          <Link className="button" href="/portfolio">
            查看作品集
          </Link>
          <Link className="button" href="/diary">
            阅读日记
          </Link>
          <Link className="button secondary" href="/messages">
            去留言
          </Link>
          <Link className="button" href="/nailong">
            获取奶龙表情包
          </Link>
          <a className="button genshin" href="https://ys.mihoyo.com/main/" data-genshin-download data-genshin-label="auto">
            下载原神
          </a>
        </div>
      </section>

      <section className="card-grid" aria-label="功能入口">
        <Link className="card" href="/about">
          <div className="card-content">
            <h2>个人简介</h2>
            <p>认识 DigitalSheep：嵌入式开发、摄影、游戏、动漫，以及正在关注的自动驾驶、AI 和智能硬件。</p>
          </div>
        </Link>

        <Link className="card" href="/portfolio">
          <div className="card-content">
            <h2>作品集</h2>
            <p>展示项目、网页、工具、自动化脚本或其它想长期保留的成果。</p>
          </div>
        </Link>

        <Link className="card" href="/diary">
          <div className="card-content">
            <h2>日记分享</h2>
            <p>记录学习、生活、部署网站和折腾技术过程中的想法。</p>
          </div>
        </Link>

        <Link className="card" href="/messages">
          <div className="card-content">
            <h2>留言板</h2>
            <p>通过 Cloudflare D1 保存公开留言，刷新后仍然可以读取。</p>
          </div>
        </Link>

        <Link className="card" href="/stats">
          <div className="card-content">
            <h2>访问统计</h2>
            <p>通过 D1 记录访问量，并展示页面访问排行。</p>
          </div>
        </Link>

        <Link className="card" href="/nailong">
          <div className="card-content">
            <h2>奶龙表情包</h2>
            <p>保留随机加载按钮，后续可以继续补充知乎或其它来源的图片直链。</p>
          </div>
        </Link>

        <a className="card" href="https://ys.mihoyo.com/main/" data-genshin-download>
          <div className="card-content">
            <h2>原神下载</h2>
            <p>点击按钮后直接使用官方下载地址，不再跳转到介绍页。</p>
          </div>
        </a>
      </section>

      <footer>
        <p>Created as a personal static website.</p>
      </footer>
    </>
  );
}
