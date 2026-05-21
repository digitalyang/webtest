import PortfolioAdminLogin from "../../../components/admin/PortfolioAdminLogin";

export const metadata = {
  title: "作品集管理登录 - DigitalSheep"
};

export default function AdminPortfolioPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Admin</div>
        <h1>作品集管理登录</h1>
        <p className="subtitle">请先登录管理员账号，再进入作品集上传和管理界面。</p>
      </section>
      <PortfolioAdminLogin />
    </>
  );
}
