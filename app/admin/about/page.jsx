import AboutAdmin from "../../../components/admin/AboutAdmin";

export const metadata = {
  title: "个人简介管理 - DigitalSheep"
};

export default function AdminAboutPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Admin</div>
        <h1>个人简介管理</h1>
        <p className="subtitle">编辑个人简介草稿，确认后发布到公开页面。</p>
      </section>
      <AboutAdmin />
    </>
  );
}
