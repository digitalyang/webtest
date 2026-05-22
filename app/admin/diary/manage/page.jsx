import DiaryAdmin from "../../../../components/admin/DiaryAdmin";

export const metadata = {
  title: "日记管理 - DigitalSheep"
};

export default function AdminDiaryManagePage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Admin</div>
        <h1>日记管理</h1>
        <p className="subtitle">新建、重新编辑或删除个人日记，正文支持 Markdown。</p>
      </section>
      <DiaryAdmin />
    </>
  );
}
