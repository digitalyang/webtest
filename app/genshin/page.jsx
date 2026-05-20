import Link from "next/link";

export const metadata = {
  title: "原神下载 - 个人主页"
};

export default function GenshinPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Official Download</div>
        <h1>原神下载入口</h1>
        <p className="subtitle">点击按钮会直接使用官方下载地址，不再跳转到介绍网页。</p>
        <div className="actions">
          <a className="button genshin" href="https://ys.mihoyo.com/main/" data-genshin-download data-genshin-label="auto">
            下载原神
          </a>
        </div>
      </section>

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}
