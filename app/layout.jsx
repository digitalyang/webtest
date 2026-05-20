import "./globals.css";
import ClientEffects from "../components/ClientEffects";
import NavBar from "../components/NavBar";
import ToastProvider from "../components/ToastProvider";

export const metadata = {
  title: "DigitalSheep",
  description: "DigitalSheep 的个人主页，记录嵌入式开发、摄影、游戏、动漫、作品集和学习轨迹。"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <ToastProvider>
          <main className="page">
            <NavBar />
            {children}
          </main>
          <ClientEffects />
        </ToastProvider>
      </body>
    </html>
  );
}
