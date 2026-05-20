import Link from "next/link";
import MessagesBoard from "../../components/MessagesBoard";

export const metadata = {
  title: "留言板 - 个人主页"
};

export default function MessagesPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Guestbook</div>
        <h1>留言板</h1>
        <p className="subtitle">留言会通过 Cloudflare D1 保存，所有访问者都可以看到最新留言。</p>
      </section>

      <MessagesBoard />

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}
