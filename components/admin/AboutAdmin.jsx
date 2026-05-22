"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_ABOUT_PROFILE,
  tagsFromLines,
  tagsToLines
} from "../../lib/about-profile";
import PortfolioAdminLogin from "./PortfolioAdminLogin";

const SESSION_EXPIRED_MESSAGE = "管理员登录已过期，请重新登录。";

function formatTime(value) {
  return value || "尚未生成";
}

export function mergeTagLinesWithExistingTags(value, existingTags = []) {
  const existingObjectsByLabel = new Map(
    (Array.isArray(existingTags) ? existingTags : [])
      .filter((tag) => tag && typeof tag === "object" && typeof tag.label === "string")
      .map((tag) => [tag.label.trim(), tag])
  );

  return tagsFromLines(value).map((label) => {
    const existingTag = existingObjectsByLabel.get(label);

    if (!existingTag) {
      return label;
    }

    return { ...existingTag, label };
  });
}

export default function AboutAdmin() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("正在验证管理员会话...");
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState(DEFAULT_ABOUT_PROFILE);
  const [draftState, setDraftState] = useState(null);
  const [publishedState, setPublishedState] = useState(null);

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

  function showLogin() {
    setIsLoggedIn(false);
    setErrorMessage(SESSION_EXPIRED_MESSAGE);
    setStatusMessage(SESSION_EXPIRED_MESSAGE);
  }

  async function runAction(workingMessage, action) {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage(workingMessage);

    try {
      await action();
    } catch (error) {
      if (error?.status === 401) {
        showLogin();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "操作失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadAboutState() {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("正在加载个人简介草稿...");

    try {
      const data = await requestJson("/api/admin/about");
      const draft = data?.draft || null;

      setDraftState(draft);
      setPublishedState(data?.published || null);
      setProfile(draft?.profile || DEFAULT_ABOUT_PROFILE);
      setIsLoggedIn(true);
      setStatusMessage("个人简介草稿已加载。");
    } catch (error) {
      if (error?.status === 401) {
        showLogin();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "个人简介草稿加载失败。");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    loadAboutState();
  }, []);

  async function saveDraft() {
    await runAction("正在保存个人简介草稿...", async () => {
      const data = await requestJson("/api/admin/about/draft", {
        method: "PUT",
        body: { profile }
      });
      const draft = data?.draft || null;

      setDraftState(draft);
      setProfile(draft?.profile || profile);
      setStatusMessage("个人简介草稿已保存。");
    });
  }

  async function publishDraft() {
    await runAction("正在发布当前草稿...", async () => {
      const data = await requestJson("/api/admin/about/publish", {
        method: "POST"
      });
      setPublishedState(data?.published || null);
      setStatusMessage("当前草稿已发布。");
    });
  }

  async function logout() {
    await runAction("正在退出登录...", async () => {
      await requestJson("/api/admin/session", {
        method: "DELETE"
      });
      router.replace("/admin/portfolio");
    });
  }

  if (!isLoggedIn) {
    return (
      <PortfolioAdminLogin
        ariaLabel="个人简介管理登录"
        redirectTo="/admin/about"
        onLogin={loadAboutState}
      />
    );
  }

  return (
    <section className="admin-panel" aria-label="个人简介管理">
      {errorMessage ? <p className="form-error" role="alert">错误消息：{errorMessage}</p> : null}
      <div className="admin-card">
        <h2>发布状态</h2>
        <p className="form-hint">状态：{statusMessage}</p>
        <div className="admin-grid">
          <p>
            <strong>草稿更新时间</strong>
            <br />
            {formatTime(draftState?.updatedAt)}
          </p>
          <p>
            <strong>发布时间</strong>
            <br />
            {formatTime(publishedState?.publishedAt)}
          </p>
        </div>
        <div className="admin-grid">
          <button className="button" type="button" disabled={isBusy} onClick={saveDraft}>
            保存草稿
          </button>
          <button className="button" type="button" disabled={isBusy} onClick={publishDraft}>
            发布当前草稿
          </button>
          <button className="button" type="button" disabled={isBusy} onClick={logout}>
            退出登录
          </button>
        </div>
      </div>

      <IdentityCard profile={profile} updateProfile={setProfile} />
      <AboutCard profile={profile} updateProfile={setProfile} />
      <GroupCard title="Game Tags" field="games" profile={profile} updateProfile={setProfile} />
      <AnimeCard profile={profile} updateProfile={setProfile} />
      <GroupCard title="Tech Stack" field="tech" profile={profile} updateProfile={setProfile} />
      <ExperienceCard profile={profile} updateProfile={setProfile} />
      <DirectionCard profile={profile} updateProfile={setProfile} />
    </section>
  );
}

function IdentityCard({ profile, updateProfile }) {
  function updateIdentity(field, value) {
    updateProfile((current) => ({
      ...current,
      identity: {
        ...current.identity,
        [field]: field === "heroTags" ? tagsFromLines(value) : value
      }
    }));
  }

  return (
    <div className="admin-card">
      <h2>身份信息</h2>
      <div className="admin-grid">
        <label>
          Badge
          <input
            value={profile.identity.badge}
            onChange={(event) => updateIdentity("badge", event.target.value)}
          />
        </label>
        <label>
          主标题
          <input
            value={profile.identity.headline}
            onChange={(event) => updateIdentity("headline", event.target.value)}
          />
        </label>
      </div>
      <label>
        副标题
        <textarea
          value={profile.identity.subtitle}
          onChange={(event) => updateIdentity("subtitle", event.target.value)}
        />
      </label>
      <label>
        个人关键词
        <textarea
          value={tagsToLines(profile.identity.heroTags)}
          onChange={(event) => updateIdentity("heroTags", event.target.value)}
        />
      </label>
      <p className="form-hint">每行一个关键词。</p>
    </div>
  );
}

function AboutCard({ profile, updateProfile }) {
  function updateAbout(field, value) {
    updateProfile((current) => ({
      ...current,
      about: {
        ...current.about,
        [field]: value
      }
    }));
  }

  function updateParagraph(index, value) {
    updateProfile((current) => ({
      ...current,
      about: {
        ...current.about,
        paragraphs: current.about.paragraphs.map((paragraph, paragraphIndex) =>
          paragraphIndex === index ? value : paragraph
        )
      }
    }));
  }

  function addParagraph() {
    updateProfile((current) => ({
      ...current,
      about: {
        ...current.about,
        paragraphs: [...current.about.paragraphs, ""]
      }
    }));
  }

  return (
    <div className="admin-card">
      <h2>About</h2>
      <label>
        About 标题
        <input
          value={profile.about.heading}
          onChange={(event) => updateAbout("heading", event.target.value)}
        />
      </label>
      {profile.about.paragraphs.map((paragraph, index) => (
        <label key={`about-paragraph-${index}`}>
          段落 {index + 1}
          <textarea value={paragraph} onChange={(event) => updateParagraph(index, event.target.value)} />
        </label>
      ))}
      <button className="button" type="button" onClick={addParagraph}>
        新增段落
      </button>
    </div>
  );
}

function GroupCard({ title, field, profile, updateProfile }) {
  function updateGroupTitle(index, value) {
    updateProfile((current) => ({
      ...current,
      [field]: current[field].map((group, groupIndex) =>
        groupIndex === index ? { ...group, title: value } : group
      )
    }));
  }

  function updateGroupTags(index, value) {
    updateProfile((current) => ({
      ...current,
      [field]: current[field].map((group, groupIndex) =>
        groupIndex === index
          ? {
              ...group,
              tags: field === "tech" ? mergeTagLinesWithExistingTags(value, group.tags) : tagsFromLines(value)
            }
          : group
      )
    }));
  }

  return (
    <div className="admin-card">
      <h2>{title}</h2>
      {profile[field].map((group, index) => (
        <section key={`${field}-group-${index}`}>
          <label>
            分组标题
            <input value={group.title} onChange={(event) => updateGroupTitle(index, event.target.value)} />
          </label>
          <label>
            标签列表
            <textarea
              value={tagsToLines(group.tags)}
              onChange={(event) => updateGroupTags(index, event.target.value)}
            />
          </label>
        </section>
      ))}
      <p className="form-hint">每行一个标签，保存后会更新当前分组内容。</p>
    </div>
  );
}

function AnimeCard({ profile, updateProfile }) {
  function updateAnime(field, value) {
    updateProfile((current) => ({
      ...current,
      anime: {
        ...current.anime,
        [field]: field === "tags" ? tagsFromLines(value) : value
      }
    }));
  }

  return (
    <div className="admin-card">
      <h2>Anime IP</h2>
      <label>
        喜欢的作品
        <textarea value={tagsToLines(profile.anime.tags)} onChange={(event) => updateAnime("tags", event.target.value)} />
      </label>
      <div className="admin-grid">
        <label>
          正在看
          <input value={profile.anime.watching} onChange={(event) => updateAnime("watching", event.target.value)} />
        </label>
        <label>
          准备看
          <input value={profile.anime.planned} onChange={(event) => updateAnime("planned", event.target.value)} />
        </label>
      </div>
    </div>
  );
}

function ExperienceCard({ profile, updateProfile }) {
  function updateExperience(index, field, value) {
    updateProfile((current) => ({
      ...current,
      experiences: current.experiences.map((experience, experienceIndex) =>
        experienceIndex === index ? { ...experience, [field]: value } : experience
      )
    }));
  }

  function deleteExperience(index) {
    updateProfile((current) => ({
      ...current,
      experiences: current.experiences.filter((_, experienceIndex) => experienceIndex !== index)
    }));
  }

  function addExperience() {
    updateProfile((current) => ({
      ...current,
      experiences: [...current.experiences, { title: "", description: "" }]
    }));
  }

  return (
    <div className="admin-card">
      <h2>Experience</h2>
      {profile.experiences.map((experience, index) => (
        <section key={`experience-${index}`}>
          <label>
            经历标题
            <input
              value={experience.title}
              onChange={(event) => updateExperience(index, "title", event.target.value)}
            />
          </label>
          <label>
            经历描述
            <textarea
              value={experience.description}
              onChange={(event) => updateExperience(index, "description", event.target.value)}
            />
          </label>
          <button className="button" type="button" onClick={() => deleteExperience(index)}>
            删除经历
          </button>
        </section>
      ))}
      <button className="button" type="button" onClick={addExperience}>
        新增经历
      </button>
    </div>
  );
}

function DirectionCard({ profile, updateProfile }) {
  return (
    <div className="admin-card">
      <h2>Direction</h2>
      <label>
        接下来关注
        <textarea
          value={profile.direction}
          onChange={(event) => updateProfile((current) => ({ ...current, direction: event.target.value }))}
        />
      </label>
    </div>
  );
}
