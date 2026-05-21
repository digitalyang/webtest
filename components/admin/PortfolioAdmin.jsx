"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INITIAL_SNAPSHOT = {
  works: [],
  roles: [],
  images: [],
  cloudName: "",
  uploadPreset: ""
};

const VISIBILITY_ENDPOINTS = {
  work: "/api/admin/portfolio/works",
  role: "/api/admin/portfolio/roles",
  image: "/api/admin/portfolio/images"
};

export default function PortfolioAdmin() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("正在验证管理员会话...");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState("尚未选择图片。");
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [workTitle, setWorkTitle] = useState("");
  const [workSlug, setWorkSlug] = useState("");
  const [roleWorkId, setRoleWorkId] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [uploadWorkId, setUploadWorkId] = useState("");
  const [uploadRoleId, setUploadRoleId] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [coverTargetType, setCoverTargetType] = useState("role");
  const [coverTargetId, setCoverTargetId] = useState("");
  const [coverImageId, setCoverImageId] = useState("");
  const [visibilityTargetType, setVisibilityTargetType] = useState("image");
  const [visibilityTargetId, setVisibilityTargetId] = useState("");
  const [visibilityHidden, setVisibilityHidden] = useState(true);

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

  async function fetchPortfolioSnapshot() {
    const data = await requestJson("/api/admin/portfolio");
    setSnapshot({
      works: Array.isArray(data.works) ? data.works : [],
      roles: Array.isArray(data.roles) ? data.roles : [],
      images: Array.isArray(data.images) ? data.images : [],
      cloudName: data.cloudName || "",
      uploadPreset: data.uploadPreset || ""
    });
    return data;
  }

  useEffect(() => {
    loadInitialPortfolio();
  }, []);

  function redirectToLogin() {
    setIsLoggedIn(false);
    router.replace("/admin/portfolio");
  }

  async function loadInitialPortfolio() {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("正在验证管理员会话...");

    try {
      await fetchPortfolioSnapshot();
      setIsLoggedIn(true);
      setStatusMessage("登录有效，作品集 snapshot 已加载。");
    } catch (error) {
      if (error?.status === 401) {
        redirectToLogin();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "作品集 snapshot 加载失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function logout() {
    await runAction("正在退出登录...", async () => {
      await requestJson("/api/admin/session", {
        method: "DELETE"
      });
      router.replace("/admin/portfolio");
    });
  }

  async function loadPortfolio() {
    await runAction("正在刷新作品集 snapshot...", async () => {
      await fetchPortfolioSnapshot();
      setStatusMessage("作品集 snapshot 已刷新。");
    });
  }

  async function createWork() {
    await runAction("正在新建作品...", async () => {
      await requestJson("/api/admin/portfolio/works", {
        method: "POST",
        body: { title: workTitle, slug: workSlug }
      });
      setWorkTitle("");
      setWorkSlug("");
      await fetchPortfolioSnapshot();
      setStatusMessage("作品已创建，snapshot 已刷新。");
    });
  }

  async function createRole() {
    await runAction("正在新建角色...", async () => {
      await requestJson("/api/admin/portfolio/roles", {
        method: "POST",
        body: { workId: roleWorkId, title: roleTitle, slug: roleSlug }
      });
      setRoleWorkId("");
      setRoleTitle("");
      setRoleSlug("");
      await fetchPortfolioSnapshot();
      setStatusMessage("角色已创建，snapshot 已刷新。");
    });
  }

  async function reserveUploadPlan(files) {
    const data = await requestJson("/api/admin/portfolio/images/plan", {
      method: "POST",
      body: {
        workId: uploadWorkId,
        roleId: uploadRoleId,
        files: files.map((file) => ({ name: file.name, type: file.type }))
      }
    });

    return Array.isArray(data.plan) ? data.plan : [];
  }

  async function uploadToCloudinary(file, publicId) {
    if (!snapshot.cloudName || !snapshot.uploadPreset) {
      throw new Error("Cloudinary cloudName 或 uploadPreset 缺失，请先刷新 snapshot。");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", snapshot.uploadPreset);
    formData.append("public_id", publicId);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${snapshot.cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error?.message || "Cloudinary 上传失败。");
    }

    return data;
  }

  async function saveImages(images) {
    await requestJson("/api/admin/portfolio/images", {
      method: "POST",
      body: {
        workId: uploadWorkId,
        roleId: uploadRoleId,
        images
      }
    });
  }

  async function uploadImages() {
    await runAction("正在上传图片...", async () => {
      const files = Array.from(uploadFiles);
      if (files.length === 0) {
        throw new Error("请选择至少一张作品图片。");
      }

      setUploadStatus("正在生成上传计划...");
      const plan = await reserveUploadPlan(files);
      if (plan.length !== files.length) {
        throw new Error("上传计划数量与文件数量不一致。");
      }

      const images = [];
      for (const [index, file] of files.entries()) {
        const plannedImage = plan[index];
        setUploadStatus(`正在上传 ${file.name} (${index + 1}/${files.length})...`);
        const uploadedImage = await uploadToCloudinary(file, plannedImage.publicId);
        images.push({
          publicId: uploadedImage.public_id || plannedImage.publicId,
          secureUrl: uploadedImage.secure_url,
          coverThumbUrl: "",
          filename: plannedImage.filename || file.name,
          alt: file.name.replace(/\.[^/.]+$/, ""),
          width: uploadedImage.width ?? null,
          height: uploadedImage.height ?? null,
          format: uploadedImage.format ?? null,
          bytes: uploadedImage.bytes ?? null,
          sortOrder: plannedImage.index
        });
      }

      setUploadStatus("正在保存图片记录...");
      await saveImages(images);
      await fetchPortfolioSnapshot();
      setUploadStatus(`上传完成：${images.length} 张图片已保存。`);
      setStatusMessage("图片已上传并保存，snapshot 已刷新。");
    });
  }

  async function setCover() {
    await runAction("正在设置封面...", async () => {
      await requestJson("/api/admin/portfolio/covers", {
        method: "POST",
        body: { targetType: coverTargetType, targetId: coverTargetId, imageId: coverImageId }
      });
      await fetchPortfolioSnapshot();
      setStatusMessage("封面已更新，snapshot 已刷新。");
    });
  }

  async function hideItem(targetType = visibilityTargetType, targetId = visibilityTargetId, isHidden = visibilityHidden) {
    const endpoint = VISIBILITY_ENDPOINTS[targetType];
    if (!endpoint) {
      setErrorMessage("隐藏目标类型无效。");
      return;
    }

    await runAction("正在更新隐藏状态...", async () => {
      await requestJson(`${endpoint}/${targetId}`, {
        method: "PATCH",
        body: { isHidden }
      });
      await fetchPortfolioSnapshot();
      setStatusMessage("隐藏状态已更新，snapshot 已刷新。");
    });
  }

  return (
    <section className="admin-panel" aria-label="作品集管理后台">
      <p className="form-hint">状态消息：{statusMessage}</p>
      <p className="form-hint">登录状态：{isLoggedIn ? "已登录" : "未登录"}</p>
      <p className="form-hint" role="status">上传状态：{uploadStatus}</p>
      {errorMessage ? <p className="form-error" role="alert">错误消息：{errorMessage}</p> : null}

      <div className="admin-card">
        <h2>会话</h2>
        <p className="form-hint">当前页面仅在管理员会话有效时加载作品集管理数据。</p>
        <button className="button" type="button" disabled={isBusy} onClick={logout}>
          退出登录
        </button>
        <button className="button secondary" type="button" disabled={isBusy} onClick={loadPortfolio}>
          刷新 snapshot
        </button>
      </div>

      <div className="admin-grid">
        <div className="admin-card">
          <h2>作品 / 角色</h2>
          <label>
            作品标题
            <input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="Girls Band Cry" />
          </label>
          <label>
            作品 slug
            <input value={workSlug} onChange={(event) => setWorkSlug(event.target.value)} placeholder="girlsbandcry" />
          </label>
          <button className="button" type="button" disabled={isBusy} onClick={createWork}>新建作品</button>
          <label>
            作品 ID
            <input value={roleWorkId} onChange={(event) => setRoleWorkId(event.target.value)} placeholder="1" />
          </label>
          <label>
            角色标题
            <input value={roleTitle} onChange={(event) => setRoleTitle(event.target.value)} placeholder="Nina" />
          </label>
          <label>
            角色 slug
            <input value={roleSlug} onChange={(event) => setRoleSlug(event.target.value)} placeholder="nina" />
          </label>
          <button className="button secondary" type="button" disabled={isBusy} onClick={createRole}>新建角色</button>
          <p className="form-hint">作品和角色都需要英文 slug，用于自动命名和 Cloudinary public_id。</p>
        </div>

        <div className="admin-card">
          <h2>上传图片</h2>
          <label>
            作品 ID
            <input value={uploadWorkId} onChange={(event) => setUploadWorkId(event.target.value)} placeholder="1" />
          </label>
          <label>
            角色 ID
            <input value={uploadRoleId} onChange={(event) => setUploadRoleId(event.target.value)} placeholder="1" />
          </label>
          <label>
            选择作品图片
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => setUploadFiles(Array.from(event.target.files || []))}
            />
          </label>
          <p className="form-hint">上传计划会根据作品 ID / 角色 ID 在服务端查 slug 并自动命名。</p>
          <button className="button" type="button" disabled={isBusy} onClick={uploadImages}>上传图片</button>
        </div>

        <div className="admin-card">
          <h2>设置封面</h2>
          <label>
            目标类型
            <select value={coverTargetType} onChange={(event) => setCoverTargetType(event.target.value)}>
              <option value="role">角色</option>
              <option value="work">作品</option>
            </select>
          </label>
          <label>
            目标 ID
            <input value={coverTargetId} onChange={(event) => setCoverTargetId(event.target.value)} placeholder="1" />
          </label>
          <label>
            图片 ID
            <input value={coverImageId} onChange={(event) => setCoverImageId(event.target.value)} placeholder="1" />
          </label>
          <p className="form-hint">选择已上传图片后，可设为角色封面或作品封面。封面使用 Cloudinary 480px WebP。</p>
          <button className="button secondary" type="button" disabled={isBusy} onClick={setCover}>设置封面</button>
        </div>

        <div className="admin-card">
          <h2>隐藏 / 恢复</h2>
          <label>
            目标类型
            <select value={visibilityTargetType} onChange={(event) => setVisibilityTargetType(event.target.value)}>
              <option value="work">作品</option>
              <option value="role">角色</option>
              <option value="image">图片</option>
            </select>
          </label>
          <label>
            目标 ID
            <input value={visibilityTargetId} onChange={(event) => setVisibilityTargetId(event.target.value)} placeholder="1" />
          </label>
          <label>
            隐藏状态
            <select value={visibilityHidden ? "true" : "false"} onChange={(event) => setVisibilityHidden(event.target.value === "true")}>
              <option value="true">隐藏</option>
              <option value="false">恢复显示</option>
            </select>
          </label>
          <button className="button secondary" type="button" disabled={isBusy} onClick={() => hideItem()}>
            更新隐藏状态
          </button>
        </div>
      </div>

      <div className="admin-grid">
        <SnapshotList
          title="作品 snapshot"
          items={snapshot.works}
          emptyText="暂无动态作品。"
          renderItem={(work) => (
            <>
              #{work.id} {work.title} / {work.slug} {work.is_hidden ? "(hidden)" : ""}
              <button className="button secondary" type="button" disabled={isBusy} onClick={() => hideItem("work", work.id, !work.is_hidden)}>
                {work.is_hidden ? "恢复" : "隐藏"}
              </button>
            </>
          )}
        />
        <SnapshotList
          title="角色 snapshot"
          items={snapshot.roles}
          emptyText="暂无动态角色。"
          renderItem={(role) => (
            <>
              #{role.id} work:{role.work_id} {role.title} / {role.slug} {role.is_hidden ? "(hidden)" : ""}
              <button className="button secondary" type="button" disabled={isBusy} onClick={() => hideItem("role", role.id, !role.is_hidden)}>
                {role.is_hidden ? "恢复" : "隐藏"}
              </button>
            </>
          )}
        />
        <SnapshotList
          title="图片 snapshot"
          items={snapshot.images}
          emptyText="暂无动态图片。"
          renderItem={(image) => (
            <>
              #{image.id} role:{image.role_id} {image.filename || image.cloudinary_public_id} {image.is_hidden ? "(hidden)" : ""}
              <button className="button secondary" type="button" disabled={isBusy} onClick={() => hideItem("image", image.id, !image.is_hidden)}>
                {image.is_hidden ? "恢复" : "隐藏"}
              </button>
            </>
          )}
        />
      </div>
    </section>
  );
}

function SnapshotList({ title, items, emptyText, renderItem }) {
  return (
    <div className="admin-card">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="form-hint">{emptyText}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
