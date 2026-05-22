import PortfolioAdminLogin from "../../../components/admin/PortfolioAdminLogin";

export const metadata = {
  title: "日记管理登录 - DigitalSheep"
};

export default function AdminDiaryPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Admin</div>
        <h1>日记管理登录</h1>
        <p className="subtitle">请先登录管理员账号，再进入日记新建、编辑和删除界面。</p>
      </section>
      <PortfolioAdminLogin ariaLabel="日记管理登录" redirectTo="/admin/diary/manage" />
    </>
  );
}
