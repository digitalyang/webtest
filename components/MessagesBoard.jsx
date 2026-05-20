"use client";

import { useEffect, useRef, useState } from "react";
import { renderMarkdown } from "../lib/message-markdown";
import { useToast } from "./ToastProvider";

const messagesApi = "/api/messages";

function formatBeijingTime(value) {
  if (!value) {
    return "";
  }

  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  })
    .format(date)
    .replaceAll("/", "-");
}

export default function MessagesBoard() {
  const showToast = useToast();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("正在加载留言...");
  const [cooldown, setCooldown] = useState(0);
  const formRef = useRef(null);

  async function loadMessages() {
    setStatus("正在加载留言...");

    try {
      const response = await fetch(messagesApi);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "留言加载失败。");
      }

      setMessages(data.messages || []);
      setStatus("");
    } catch (error) {
      setMessages([]);
      setStatus(error.message);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const timer = window.setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submitMessage(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const content = String(formData.get("content") || "").trim();
    const website = String(formData.get("website") || "").trim();

    if (!name || !content) {
      showToast("请先填写昵称和留言内容。");
      return;
    }

    try {
      const response = await fetch(messagesApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, content, website })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "留言发布失败。");
      }

      formRef.current?.reset();
      showToast("留言发布成功。");
      await loadMessages();
    } catch (error) {
      showToast(error.message);
    } finally {
      setCooldown(3);
    }
  }

  return (
    <section className="message-board">
      <form className="message-form" ref={formRef} onSubmit={submitMessage}>
        <label>
          昵称
          <input name="name" type="text" maxLength="20" placeholder="请输入昵称" required />
        </label>
        <label>
          留言
          <textarea
            name="content"
            rows="8"
            maxLength="3000"
            placeholder="支持 Markdown，例如 **加粗**、列表、链接和代码块，最多 3000 字"
            required
          />
        </label>
        <p className="form-hint">支持常用 Markdown 语法；原始 HTML 会被过滤后再展示。</p>
        <label className="honeypot" aria-hidden="true">
          个人网站
          <input name="website" type="text" tabIndex="-1" autoComplete="off" />
        </label>
        <div className="actions compact">
          <button className="button" type="submit" disabled={cooldown > 0}>
            {cooldown > 0 ? `请等待 ${cooldown} 秒` : "发布留言"}
          </button>
          <button className="button secondary" type="button" onClick={() => showToast("公开留言不能在前端直接清空。")}>
            说明
          </button>
        </div>
      </form>

      <div className="messages" aria-live="polite">
        {status ? <p className="empty-state">{status}</p> : null}
        {!status && messages.length === 0 ? <p className="empty-state">还没有留言，来写第一条吧。</p> : null}
        {!status
          ? messages.map((message) => (
              <article className="message-item" key={message.id}>
                <div className="message-meta">
                  <strong>{message.name}</strong>
                  <time>{formatBeijingTime(message.time)}</time>
                </div>
                <div className="message-content markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
              </article>
            ))
          : null}
      </div>
    </section>
  );
}
