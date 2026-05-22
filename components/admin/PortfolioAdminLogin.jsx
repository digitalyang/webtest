"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortfolioAdminLogin({ redirectTo = "/admin/portfolio/upload", onLogin }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function login() {
    setIsBusy(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || `请求失败：${response.status}`);
      }

      setPassword("");
      if (onLogin) {
        await onLogin();
      } else {
        router.push(redirectTo);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "登录失败。");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="admin-panel" aria-label="作品集管理登录">
      {errorMessage ? <p className="form-error" role="alert">错误消息：{errorMessage}</p> : null}
      <div className="admin-card">
        <h2>管理员登录</h2>
        <label>
          管理密码
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Admin password"
            type="password"
          />
        </label>
        <button className="button" type="button" disabled={isBusy} onClick={login}>
          登录
        </button>
      </div>
    </section>
  );
}
