import Link from "next/link";
import DiaryEntries from "../../components/DiaryEntries";
import { getRequestContext } from "../../lib/server/cloudflare";
import { listDiaryEntries } from "../../lib/server/diary";

export const metadata = {
  title: "日记分享 - 个人主页"
};

export const dynamic = "force-dynamic";

export default async function DiaryPage() {
  const entries = await getDiaryEntries();

  return (
    <>
      <section className="hero">
        <div className="badge">Diary</div>
        <h1>日记分享</h1>
        <p className="subtitle">记录一些学习、生活和搭建网站过程中的想法。</p>
      </section>

      <DiaryEntries entries={entries} />

      <footer>
        <p>
          <Link href="/">返回首页</Link>
        </p>
      </footer>
    </>
  );
}

async function getDiaryEntries() {
  try {
    return listDiaryEntries(getRequestContext().env);
  } catch {
    return listDiaryEntries(undefined);
  }
}
