"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PortfolioAdminLogin from "./PortfolioAdminLogin";

const PAGE_SIZE = 10;
const INITIAL_DATA = {
  messages: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE
};
const SESSION_EXPIRED_MESSAGE = "管理员登录已过期，请重新登录。";

export default function MessageAdmin() {
  const router = useRouter();
  const [data, setData] = useState(INITIAL_DATA);
  const [activeQuery, setActiveQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("正在验证管理员会话...");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  useEffect(() => {
    loadMessages();
  }, []);

  async function requestJson(url, { method = "GET" } = {}) {
    const response = await fetch(url, {
      method,
      credentials: "same-origin"
    });
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(responseData?.error || `请求失败：${response.status}`);
      error.status = response.status;
      throw error;
    }

    return responseData;
  }

  function buildMessagesUrl(page, query) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      q: query
    });

    return `/api/admin/messages?${params.toString()}`;
  }

  async function loadMessages({ nextPage = data.page, nextQuery = activeQuery } = {}) {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("正在加载留言...");

    try {
      const nextData = await requestJson(buildMessagesUrl(nextPage, nextQuery));
      setData({
        messages: Array.isArray(nextData.messages) ? nextData.messages : [],
        total: Number(nextData.total || 0),
        page: Number(nextData.page || nextPage),
        pageSize: Number(nextData.pageSize || PAGE_SIZE)
      });
      setNeedsLogin(false);
      setStatusMessage("留言列表已加载。");
    } catch (error) {
      if (error?.status === 401) {
        setNeedsLogin(true);
        setStatusMessage(SESSION_EXPIRED_MESSAGE);
        setErrorMessage(SESSION_EXPIRED_MESSAGE);
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "留言列表加载失败。");
      setStatusMessage("留言列表加载失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function submitSearch(event) {
    event.preventDefault();
    const nextQuery = searchQuery.trim();
    setActiveQuery(nextQuery);
    await loadMessages({ nextPage: 1, nextQuery });
  }

  async function clearSearch() {
    setSearchQuery("");
    setActiveQuery("");
    await loadMessages({ nextPage: 1, nextQuery: "" });
  }

  async function deleteMessage(messageId) {
    if (!window.confirm("确定要永久删除这条留言吗？删除后不可恢复。")) {
      return;
    }

    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("正在永久删除留言...");

    try {
      await requestJson(`/api/admin/messages/${encodeURIComponent(messageId)}`, {
        method: "DELETE"
      });
      const nextPage = data.messages.length <= 1 && data.page > 1 ? data.page - 1 : data.page;
      await loadMessages({ nextPage, nextQuery: activeQuery });
      setStatusMessage("留言已永久删除。");
    } catch (error) {
      if (error?.status === 401) {
        setNeedsLogin(true);
        setStatusMessage(SESSION_EXPIRED_MESSAGE);
        setErrorMessage(SESSION_EXPIRED_MESSAGE);
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "留言删除失败。");
      setStatusMessage("留言删除失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function logout() {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("正在退出登录...");

    try {
      await requestJson("/api/admin/session", {
        method: "DELETE"
      });
      router.replace("/admin/portfolio");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "退出登录失败。");
      setStatusMessage("退出登录失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogin() {
    setNeedsLogin(false);
    setErrorMessage("");
    await loadMessages({ nextPage: 1, nextQuery: activeQuery });
  }

  return (
    <section className="admin-panel" aria-label="留言管理后台">
      <p className="form-hint">状态消息：{statusMessage}</p>
      {errorMessage ? <p className="form-error" role="alert">错误消息：{errorMessage}</p> : null}

      {needsLogin ? (
        <PortfolioAdminLogin redirectTo="/admin/messages" onLogin={handleLogin} />
      ) : (
        <>
          <div className="admin-card">
            <h2>会话</h2>
            <p className="form-hint">当前页面仅在管理员会话有效时加载留言管理数据。</p>
            <button className="button" type="button" disabled={isBusy} onClick={logout}>
              退出登录
            </button>
          </div>

          <div className="admin-card">
            <h2>留言搜索</h2>
            <form className="message-form" onSubmit={submitSearch}>
              <label>
                搜索关键词
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="按昵称或留言内容搜索"
                />
              </label>
              <div className="actions compact">
                <button className="button" type="submit" disabled={isBusy}>
                  搜索
                </button>
                <button className="button secondary" type="button" disabled={isBusy} onClick={clearSearch}>
                  清空
                </button>
              </div>
            </form>
            <p className="form-hint">永久删除前会要求确认，删除后不可恢复。</p>
          </div>

          <div className="admin-card">
            <h2>留言列表</h2>
            <p className="form-hint">共 {data.total} 条留言，当前第 {data.page} / {totalPages} 页。</p>
            <div className="actions compact">
              <button
                className="button secondary"
                type="button"
                disabled={isBusy || data.page <= 1}
                onClick={() => loadMessages({ nextPage: data.page - 1, nextQuery: activeQuery })}
              >
                上一页
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={isBusy || data.page >= totalPages}
                onClick={() => loadMessages({ nextPage: data.page + 1, nextQuery: activeQuery })}
              >
                下一页
              </button>
            </div>

            <div className="messages">
              {data.messages.length === 0 ? (
                <p className="empty-state">暂无留言。</p>
              ) : (
                data.messages.map((message) => (
                  <article className="message-item" key={message.id}>
                    <div className="message-meta">
                      <strong>{message.name || "匿名访客"}</strong>
                      <time dateTime={message.time || undefined}>{message.time || "未知时间"}</time>
                    </div>
                    <p className="message-content">{message.content}</p>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={isBusy}
                      onClick={() => deleteMessage(message.id)}
                    >
                      永久删除
                    </button>
                  </article>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
