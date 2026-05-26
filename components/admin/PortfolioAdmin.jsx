"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateUploadProgress,
  fileNeedsCompression,
  prepareImageForUpload
} from "../../lib/client/image-compression";
import {
  buildCoverPhotoOptions,
  getCoverPayload
} from "../../lib/client/portfolio-cover-options";
import { buildCnPhotoOptions } from "../../lib/client/portfolio-cn-options";
import {
  buildVisibilityImageOptions,
  buildVisibilityRoleOptions,
  buildVisibilityWorkOptions,
  getVisibilityPayload
} from "../../lib/client/portfolio-visibility-options";

const INITIAL_SNAPSHOT = {
  works: [],
  roles: [],
  images: [],
  adminOptions: { works: [], rolesByWork: {} },
  staticImages: [],
  staticLocalImages: [],
  staticRoles: [],
  staticCoverOverrides: [],
  imageCredits: [],
  cloudName: "",
  uploadPreset: ""
};

const VISIBILITY_ENDPOINTS = {
  work: "/api/admin/portfolio/works",
  "static-work": "/api/admin/portfolio/works",
  role: "/api/admin/portfolio/roles",
  "static-role": "/api/admin/portfolio/static-roles",
  image: "/api/admin/portfolio/images",
  "static-image": "/api/admin/portfolio/images"
};

export default function PortfolioAdmin() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("正在验证管理员会话...");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadStatus, setUploadStatus] = useState("尚未选择图片。");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionMessages, setCompressionMessages] = useState([]);
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [workTitle, setWorkTitle] = useState("");
  const [workSlug, setWorkSlug] = useState("");
  const [roleParentWorkKey, setRoleParentWorkKey] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [selectedWorkKey, setSelectedWorkKey] = useState("");
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [coverTargetType, setCoverTargetType] = useState("role");
  const [coverWorkKey, setCoverWorkKey] = useState("");
  const [coverRoleKey, setCoverRoleKey] = useState("");
  const [coverPhotoKey, setCoverPhotoKey] = useState("");
  const [cnWorkKey, setCnWorkKey] = useState("");
  const [cnRoleKey, setCnRoleKey] = useState("");
  const [cnPhotoKey, setCnPhotoKey] = useState("");
  const [cnCoserName, setCnCoserName] = useState("");
  const [visibilityTargetType, setVisibilityTargetType] = useState("work");
  const [visibilityWorkKey, setVisibilityWorkKey] = useState("");
  const [visibilityRoleKey, setVisibilityRoleKey] = useState("");
  const [visibilityImageKey, setVisibilityImageKey] = useState("");
  const [visibilityHidden, setVisibilityHidden] = useState(true);
  const workOptions = snapshot.adminOptions?.works || [];
  const roleOptions = selectedWorkKey ? snapshot.adminOptions?.rolesByWork?.[selectedWorkKey] || [] : [];
  const selectedRole = roleOptions.find((role) => role.value === selectedRoleKey);
  const coverRoleOptions = coverWorkKey ? snapshot.adminOptions?.rolesByWork?.[coverWorkKey] || [] : [];
  const selectedCoverWork = workOptions.find((work) => work.value === coverWorkKey);
  const selectedCoverRole = coverRoleOptions.find((role) => role.value === coverRoleKey);
  const coverPhotoOptions = buildCoverPhotoOptions(selectedCoverRole, snapshot);
  const selectedCoverPhoto = coverPhotoOptions.find((photo) => photo.value === coverPhotoKey);
  const cnRoleOptions = cnWorkKey ? snapshot.adminOptions?.rolesByWork?.[cnWorkKey] || [] : [];
  const selectedCnRole = cnRoleOptions.find((role) => role.value === cnRoleKey);
  const cnPhotoOptions = buildCnPhotoOptions(selectedCnRole, snapshot);
  const selectedCnPhoto = cnPhotoOptions.find((photo) => photo.value === cnPhotoKey);
  const visibilityWorkOptions = buildVisibilityWorkOptions(snapshot);
  const visibilityRoleOptions = buildVisibilityRoleOptions(snapshot, visibilityWorkKey);
  const visibilityImageOptions = buildVisibilityImageOptions(snapshot, visibilityTargetType, visibilityRoleKey);
  const visibilityNeedsRole = visibilityTargetType === "role" || visibilityTargetType === "image" || visibilityTargetType === "static-image";
  const visibilityNeedsImage = visibilityTargetType === "image" || visibilityTargetType === "static-image";

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
      adminOptions: data.adminOptions || { works: [], rolesByWork: {} },
      staticImages: Array.isArray(data.staticImages) ? data.staticImages : [],
      staticLocalImages: Array.isArray(data.staticLocalImages) ? data.staticLocalImages : [],
      staticRoles: Array.isArray(data.staticRoles) ? data.staticRoles : [],
      staticCoverOverrides: Array.isArray(data.staticCoverOverrides) ? data.staticCoverOverrides : [],
      imageCredits: Array.isArray(data.imageCredits) ? data.imageCredits : [],
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
      const parentWork = workOptions.find((work) => work.value === roleParentWorkKey);
      if (!parentWork) {
        throw new Error("请选择角色所属作品。");
      }

      await requestJson("/api/admin/portfolio/roles", {
        method: "POST",
        body: parentWork.source === "static"
          ? { targetType: "static", staticWorkId: parentWork.id, title: roleTitle, slug: roleSlug }
          : { workId: parentWork.id, title: roleTitle, slug: roleSlug }
      });
      setRoleParentWorkKey("");
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
        targetType: selectedRole?.source === "dynamic" ? "dynamic" : "static",
        workId: selectedRole?.workSource === "dynamic" ? selectedRole.workId : undefined,
        roleId: selectedRole?.source === "dynamic" ? selectedRole.id : undefined,
        staticWorkId: selectedRole?.workSource === "static" ? selectedRole.workId : undefined,
        staticRoleId: selectedRole?.workSource === "static" ? selectedRole.id : undefined,
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
        targetType: selectedRole?.source === "dynamic" ? "dynamic" : "static",
        workId: selectedRole?.workSource === "dynamic" ? selectedRole.workId : undefined,
        roleId: selectedRole?.source === "dynamic" ? selectedRole.id : undefined,
        staticWorkId: selectedRole?.workSource === "static" ? selectedRole.workId : undefined,
        staticRoleId: selectedRole?.workSource === "static" ? selectedRole.id : undefined,
        images
      }
    });
  }

  function resetUploadProgress(files = []) {
    setUploadFiles(files);
    setUploadProgress(0);
    setCompressionMessages([]);
    setUploadStatus(files.length > 0 ? `已选择 ${files.length} 张图片。` : "尚未选择图片。");
  }

  async function prepareFilesForUpload(files) {
    const preparedFiles = [];

    for (const [index, file] of files.entries()) {
      if (fileNeedsCompression(file)) {
        setUploadStatus(`正在压缩 ${file.name} (${index + 1}/${files.length})...`);
      } else {
        setUploadStatus(`正在检查 ${file.name} (${index + 1}/${files.length})...`);
      }

      const prepared = await prepareImageForUpload(file);
      preparedFiles.push(prepared.file);
      if (prepared.message) {
        setCompressionMessages((messages) => [...messages, prepared.message]);
      }
      setUploadProgress(calculateUploadProgress("compress", index + 1, files.length));
    }

    return preparedFiles;
  }

  async function uploadImages() {
    await runAction("正在上传图片...", async () => {
      const files = Array.from(uploadFiles);
      if (files.length === 0) {
        throw new Error("请选择至少一张作品图片。");
      }
      if (!selectedRole) {
        throw new Error("请选择作品和相册。");
      }

      setUploadProgress(calculateUploadProgress("plan", 0, files.length));
      setUploadStatus("正在生成上传计划...");
      const plan = await reserveUploadPlan(files);
      if (plan.length !== files.length) {
        throw new Error("上传计划数量与文件数量不一致。");
      }

      const preparedFiles = await prepareFilesForUpload(files);

      const images = [];
      for (const [index, file] of preparedFiles.entries()) {
        const plannedImage = plan[index];
        setUploadStatus(`正在上传 ${file.name} (${index + 1}/${preparedFiles.length})...`);
        const uploadedImage = await uploadToCloudinary(file, plannedImage.publicId);
        setUploadProgress(calculateUploadProgress("upload", index + 1, preparedFiles.length));
        images.push({
          publicId: plannedImage.publicId,
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

      setUploadProgress(calculateUploadProgress("save", 0, preparedFiles.length));
      setUploadStatus("正在保存图片记录...");
      await saveImages(images);
      setUploadStatus("正在刷新 snapshot...");
      await fetchPortfolioSnapshot();
      setUploadProgress(calculateUploadProgress("complete", 0, preparedFiles.length));
      setUploadStatus(`上传完成：${images.length} 张图片已保存。`);
      setStatusMessage("图片已上传并保存，snapshot 已刷新。");
    });
  }

  async function setCover() {
    await runAction("正在设置封面...", async () => {
      await requestJson("/api/admin/portfolio/covers", {
        method: "POST",
        body: getCoverPayload({
          coverTargetType,
          selectedCoverWork,
          selectedCoverRole,
          selectedCoverPhoto
        })
      });
      await fetchPortfolioSnapshot();
      setCoverPhotoKey("");
      setStatusMessage("封面已更新，snapshot 已刷新。");
    });
  }

  async function setImageCredit(coserName = cnCoserName) {
    await runAction("正在设置图片 CN...", async () => {
      if (!selectedCnPhoto) {
        throw new Error("请选择图片。");
      }

      await requestJson("/api/admin/portfolio/image-credits", {
        method: "POST",
        body: {
          imageSource: selectedCnPhoto.imageSource,
          imageKey: selectedCnPhoto.imageKey,
          coserName
        }
      });
      await fetchPortfolioSnapshot();
      setCnCoserName(coserName.trim() === "佚名" ? "" : coserName.trim());
      setStatusMessage(coserName.trim() && coserName.trim() !== "佚名"
        ? "图片 CN 已保存，snapshot 已刷新。"
        : "图片 CN 已清空，snapshot 已刷新。");
    });
  }

  async function hideItem(targetType, targetId, isHidden) {
    let payload;

    try {
      payload = targetType !== undefined && targetId !== undefined
        ? { targetType, targetId, isHidden: Boolean(isHidden) }
        : getVisibilityPayload({
          targetType: visibilityTargetType,
          workKey: visibilityWorkKey,
          roleKey: visibilityRoleKey,
          imageKey: visibilityImageKey,
          isHidden: visibilityHidden
        });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "隐藏状态参数无效。");
      return;
    }

    const endpoint = VISIBILITY_ENDPOINTS[payload.targetType];
    if (!endpoint) {
      setErrorMessage("隐藏目标类型无效。");
      return;
    }

    await runAction("正在更新隐藏状态...", async () => {
      await requestJson(`${endpoint}/${encodeURIComponent(payload.targetId)}`, {
        method: "PATCH",
        body: { isHidden: payload.isHidden }
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
            角色所属作品
            <select value={roleParentWorkKey} onChange={(event) => setRoleParentWorkKey(event.target.value)}>
              <option value="">请选择角色所属作品</option>
              {workOptions.map((work) => (
                <option key={work.value} value={work.value}>{work.label}</option>
              ))}
            </select>
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
            选择作品
            <select value={selectedWorkKey} onChange={(event) => {
              setSelectedWorkKey(event.target.value);
              setSelectedRoleKey("");
            }}>
              <option value="">请选择作品</option>
              {workOptions.map((work) => (
                <option key={work.value} value={work.value}>{work.label}</option>
              ))}
            </select>
          </label>
          <label>
            选择相册
            <select value={selectedRoleKey} onChange={(event) => setSelectedRoleKey(event.target.value)} disabled={!selectedWorkKey}>
              <option value="">请选择相册</option>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          <label>
            选择作品图片
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => resetUploadProgress(Array.from(event.target.files || []))}
            />
          </label>
          <p className="form-hint">上传计划会根据选择的作品和相册在服务端查 slug 并自动命名。</p>
          <div className="upload-progress" aria-label="上传进度">
            <div className="upload-progress-header">
              <span>上传进度</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="upload-progress-track">
              <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="form-hint">压缩详情</p>
            {compressionMessages.length === 0 ? (
              <p className="form-hint">暂无压缩记录。</p>
            ) : (
              <ul>
                {compressionMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </div>
          <button className="button" type="button" disabled={isBusy} onClick={uploadImages}>上传图片</button>
        </div>

        <div className="admin-card">
          <h2>设置封面</h2>
          <label>
            封面类型
            <select value={coverTargetType} onChange={(event) => {
              setCoverTargetType(event.target.value);
              setCoverPhotoKey("");
            }}>
              <option value="work">作品封面</option>
              <option value="role">角色封面</option>
            </select>
          </label>
          <label>
            选择封面作品
            <select value={coverWorkKey} onChange={(event) => {
              setCoverWorkKey(event.target.value);
              setCoverRoleKey("");
              setCoverPhotoKey("");
            }}>
              <option value="">请选择作品</option>
              {workOptions.map((work) => (
                <option key={work.value} value={work.value}>{work.label}</option>
              ))}
            </select>
          </label>
          <label>
            选择封面角色
            <select value={coverRoleKey} onChange={(event) => {
              setCoverRoleKey(event.target.value);
              setCoverPhotoKey("");
            }} disabled={!coverWorkKey}>
              <option value="">请选择角色</option>
              {coverRoleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          <label>
            选择封面
            <select value={coverPhotoKey} onChange={(event) => setCoverPhotoKey(event.target.value)} disabled={!coverRoleKey}>
              <option value="">{coverRoleKey ? "请选择封面" : "请先选择角色"}</option>
              {coverPhotoOptions.map((photo) => (
                <option key={photo.value} value={photo.value}>{photo.label}</option>
              ))}
            </select>
          </label>
          {coverRoleKey && coverPhotoOptions.length === 0 ? <p className="form-hint">这个角色暂无可选照片。</p> : null}
          <p className="form-hint">选择作品、角色和照片后，可设置为作品封面或角色封面。</p>
          <button className="button secondary" type="button" disabled={isBusy} onClick={setCover}>设置封面</button>
        </div>

        <div className="admin-card">
          <h2>设置图片 CN</h2>
          <label>
            选择 CN 作品
            <select value={cnWorkKey} onChange={(event) => {
              setCnWorkKey(event.target.value);
              setCnRoleKey("");
              setCnPhotoKey("");
              setCnCoserName("");
            }}>
              <option value="">请选择作品</option>
              {workOptions.map((work) => (
                <option key={work.value} value={work.value}>{work.label}</option>
              ))}
            </select>
          </label>
          <label>
            选择 CN 角色
            <select value={cnRoleKey} onChange={(event) => {
              setCnRoleKey(event.target.value);
              setCnPhotoKey("");
              setCnCoserName("");
            }} disabled={!cnWorkKey}>
              <option value="">请选择角色</option>
              {cnRoleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          <label>
            选择图片
            <select value={cnPhotoKey} onChange={(event) => {
              const nextPhotoKey = event.target.value;
              const nextPhoto = cnPhotoOptions.find((photo) => photo.value === nextPhotoKey);
              setCnPhotoKey(nextPhotoKey);
              setCnCoserName(nextPhoto?.coserName || "");
            }} disabled={!cnRoleKey}>
              <option value="">{cnRoleKey ? "请选择图片" : "请先选择角色"}</option>
              {cnPhotoOptions.map((photo) => (
                <option key={photo.value} value={photo.value}>{photo.label}</option>
              ))}
            </select>
          </label>
          <label>
            CN 圈名
            <input value={cnCoserName} onChange={(event) => setCnCoserName(event.target.value)} placeholder="留空或佚名则不显示" />
          </label>
          {cnRoleKey && cnPhotoOptions.length === 0 ? <p className="form-hint">这个角色暂无可设置 CN 的图片。</p> : null}
          <p className="form-hint">未填写或填写“佚名”时，公开页面不会显示 CN 标注。</p>
          <button className="button secondary" type="button" disabled={isBusy} onClick={() => setImageCredit()}>
            保存 CN
          </button>
          <button className="button secondary" type="button" disabled={isBusy} onClick={() => setImageCredit("")}>
            清空 CN
          </button>
        </div>

        <div className="admin-card">
          <h2>隐藏 / 恢复</h2>
          <label>
            操作对象
            <select value={visibilityTargetType} onChange={(event) => {
              setVisibilityTargetType(event.target.value);
              setVisibilityWorkKey("");
              setVisibilityRoleKey("");
              setVisibilityImageKey("");
            }}>
              <option value="work">作品</option>
              <option value="role">角色</option>
              <option value="image">动态图片</option>
              <option value="static-image">追加图片</option>
            </select>
          </label>
          <label>
            选择隐藏作品
            <select value={visibilityWorkKey} onChange={(event) => {
              setVisibilityWorkKey(event.target.value);
              setVisibilityRoleKey("");
              setVisibilityImageKey("");
            }}>
              <option value="">请选择作品</option>
              {visibilityWorkOptions.map((work) => (
                <option key={work.value} value={work.value}>{work.label}</option>
              ))}
            </select>
          </label>
          <label hidden={!visibilityNeedsRole}>
            选择隐藏角色
            <select value={visibilityRoleKey} onChange={(event) => {
              setVisibilityRoleKey(event.target.value);
              setVisibilityImageKey("");
            }} disabled={!visibilityNeedsRole || !visibilityWorkKey}>
              <option value="">{visibilityWorkKey ? "请选择角色" : "请先选择作品"}</option>
              {visibilityRoleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          <label hidden={!visibilityNeedsImage}>
            选择隐藏图片
            <select value={visibilityImageKey} onChange={(event) => setVisibilityImageKey(event.target.value)} disabled={!visibilityNeedsImage || !visibilityRoleKey}>
              <option value="">{visibilityRoleKey ? "请选择图片" : "请先选择角色"}</option>
              {visibilityImageOptions.map((image) => (
                <option key={image.value} value={image.value}>{image.label}</option>
              ))}
            </select>
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
        <SnapshotList
          title="追加图片 snapshot"
          items={snapshot.staticImages}
          emptyText="暂无静态追加图片。"
          renderItem={(image) => (
            <>
              #{image.id} role:{image.static_role_id} {image.filename || image.cloudinary_public_id} {image.is_hidden ? "(hidden)" : ""}
              <button className="button secondary" type="button" disabled={isBusy} onClick={() => hideItem("static-image", `static:${image.id}`, !image.is_hidden)}>
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
