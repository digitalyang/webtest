import MessageAdmin from "../../../components/admin/MessageAdmin";

export const metadata = {
  title: "留言管理 - DigitalSheep"
};

export default function AdminMessagesPage() {
  return (
    <>
      <section className="hero">
        <div className="badge">Admin</div>
        <h1>留言管理</h1>
        <p className="subtitle">搜索、分页查看留言，并永久删除不需要保留的内容。</p>
      </section>
      <MessageAdmin />
    </>
  );
}
