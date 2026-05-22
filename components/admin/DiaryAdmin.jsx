"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_FORM = {
  id: "",
  title: "",
  entryDate: "",
  content: "",
  isHidden: false
};

export default function DiaryAdmin() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("正在验证管理员会话...");
  const [errorMessage, setErrorMessage] = useState("");
  const isEditing = Boolean(form.id);

  useEffect(() => {
    loadInitialDiary();
  }, []);

  async function requestJson(url, { method = "GET", body } = {}) {
    const response = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data?.error || `请求失败：${response.status}`);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  async function runAction(workingMessage, action) {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage(workingMessage);

    try {
      await action();
    } catch (error) {
      if (error?.status === 401) {
        redirectToLogin();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function fetchDiaryEntries() {
    const data = await requestJson("/api/admin/diary");
    setEntries(Array.isArray(data.entries) ? data.entries : []);
    return data;
  }

  async function loadInitialDiary() {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("正在验证管理员会话...");

    try {
      await fetchDiaryEntries();
      setIsLoggedIn(true);
      setStatusMessage("登录有效，日记列表已加载。");
    } catch (error) {
      if (error?.status === 401) {
        redirectToLogin();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "日记列表加载失败。");
    } finally {
      setIsBusy(false);
    }
  }

  function redirectToLogin() {
    setIsLoggedIn(false);
    router.replace("/admin/diary");
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function startEdit(entry) {
    setForm({
      id: String(entry.id),
      title: entry.title,
      entryDate: entry.entryDate,
      content: entry.content,
      isHidden: entry.isHidden
    });
  }

  async function logout() {
    await runAction("正在退出登录...", async () => {
      await requestJson("/api/admin/session", { method: "DELETE" });
      router.replace("/admin/diary");
    });
  }

  async function refreshDiary() {
    await runAction("正在刷新日记列表...", async () => {
      await fetchDiaryEntries();
      setStatusMessage("日记列表已刷新。");
    });
  }

  async function saveDiary() {
    await runAction(isEditing ? "正在重新编辑日记..." : "正在新建日记...", async () => {
      await requestJson(isEditing ? `/api/admin/diary/${encodeURIComponent(form.id)}` : "/api/admin/diary", {
        method: isEditing ? "PUT" : "POST",
        body: {
          title: form.title,
          entryDate: form.entryDate,
          content: form.content,
          isHidden: form.isHidden
        }
      });
      resetForm();
      await fetchDiaryEntries();
      setStatusMessage(isEditing ? "日记已更新。" : "日记已创建。");
    });
  }

  async function deleteDiary(entryId = form.id) {
    if (!entryId) {
      setErrorMessage("请先从日记列表选择要删除的日记。");
      return;
    }

    await runAction("正在删除日记...", async () => {
      await requestJson(`/api/admin/diary/${encodeURIComponent(entryId)}`, {
        method: "DELETE"
      });
      if (String(entryId) === String(form.id)) {
        resetForm();
      }
      await fetchDiaryEntries();
      setStatusMessage("日记已删除。");
    });
  }

  return (
    <section className="admin-panel" aria-label="日记管理后台">
      <p className="form-hint">状态消息：{statusMessage}</p>
      <p className="form-hint">登录状态：{isLoggedIn ? "已登录" : "未登录"}</p>
      {errorMessage ? <p className="form-error" role="alert">错误消息：{errorMessage}</p> : null}

      <div className="admin-card">
        <h2>会话</h2>
        <p className="form-hint">当前页面复用作品集管理员登录会话。</p>
        <button className="button" type="button" disabled={isBusy} onClick={logout}>
          退出登录
        </button>
        <button className="button secondary" type="button" disabled={isBusy} onClick={refreshDiary}>
          刷新日记列表
        </button>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <h2>{isEditing ? "重新编辑日记" : "新建日记"}</h2>
          <p className="form-hint">重新编辑日记：从右侧日记列表选择一篇，修改后保存。</p>
          <label>
            日记标题
            <input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="今天的记录" />
          </label>
          <label>
            日记日期
            <input type="date" value={form.entryDate} onChange={(event) => updateForm("entryDate", event.target.value)} />
          </label>
          <label>
            Markdown 正文
            <textarea
              rows={12}
              value={form.content}
              onChange={(event) => updateForm("content", event.target.value)}
              placeholder="支持 **加粗**、列表、链接、引用和代码块。"
            />
          </label>
          <label>
            显示状态
            <select value={form.isHidden ? "hidden" : "visible"} onChange={(event) => updateForm("isHidden", event.target.value === "hidden")}>
              <option value="visible">公开显示</option>
              <option value="hidden">隐藏草稿</option>
            </select>
          </label>
          <button className="button" type="button" disabled={isBusy} onClick={saveDiary}>
            {isEditing ? "保存日记" : "新建日记"}
          </button>
          <button className="button secondary" type="button" disabled={isBusy || !isEditing} onClick={() => deleteDiary()}>
            删除日记
          </button>
          <button className="button secondary" type="button" disabled={isBusy} onClick={resetForm}>
            清空编辑器
          </button>
        </div>

        <div className="admin-card">
          <h2>日记列表</h2>
          {entries.length === 0 ? (
            <p className="form-hint">暂无日记，创建后会出现在这里。</p>
          ) : (
            <ul className="admin-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <span>
                    #{entry.id} {entry.entryDate} {entry.title} {entry.isHidden ? "(hidden)" : ""}
                  </span>
                  <button className="button secondary" type="button" disabled={isBusy} onClick={() => startEdit(entry)}>
                    编辑
                  </button>
                  <button className="button secondary" type="button" disabled={isBusy} onClick={() => deleteDiary(entry.id)}>
                    删除日记
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
