import "./globals.css";
import ClientEffects from "../components/ClientEffects";
import NavBar from "../components/NavBar";
import ToastProvider from "../components/ToastProvider";

export const metadata = {
  title: "个人主页",
  description: "个人主页、作品集、日记分享、留言板和访问统计。"
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
