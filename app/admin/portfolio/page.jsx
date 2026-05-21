import PortfolioAdmin from "../../../components/admin/PortfolioAdmin";

export const metadata = {
  title: "作品集管理 - DigitalSheep"
};

export default function AdminPortfolioPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Admin</div>
        <h1>作品集管理</h1>
        <p className="subtitle">新建作品、角色相册，上传 Cloudinary 图片并维护封面。</p>
      </section>
      <PortfolioAdmin />
    </>
  );
}
