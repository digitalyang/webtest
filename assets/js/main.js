function showToast(message) {
  const toast = document.querySelector("#toast");

  if (!toast) {
    return;
  }

  clearTimeout(window.webtestToastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  window.webtestToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function setupTestButtons() {
  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(button.dataset.toast);
    });
  });
}

const genshinDownloadLinks = {
  pc: {
    label: "下载原神（PC版）",
    url: "https://ys-api.mihoyo.com/event/download_porter/link/ys_cn/official/pc_default",
    tip: "正在从官方源下载原神 PC 安装器。",
    directDownload: true
  },
  android: {
    label: "下载原神（安卓版）",
    url: "https://ys-api.mihoyo.com/event/download_porter/link/ys_cn/official/android_default",
    tip: "正在从官方源下载原神安卓版。",
    directDownload: true
  },
  ios: {
    label: "下载原神（iOS版）",
    url: "https://ys-api.mihoyo.com/event/download_porter/link/ys_cn/official/ios_default",
    tip: "正在打开 App Store 下载原神。",
    directDownload: false
  },
  official: {
    label: "原神官网",
    url: "https://ys.mihoyo.com/main/",
    tip: "当前设备暂无匹配安装包，正在打开原神官网。",
    directDownload: false
  }
};

function isIpadOS() {
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function detectGenshinPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();

  if (userAgent.includes("android")) {
    return "android";
  }

  if (/iphone|ipad|ipod/.test(userAgent) || isIpadOS()) {
    return "ios";
  }

  if (platform.includes("win")) {
    return "pc";
  }

  return "official";
}

function setupGenshinDownloadLinks() {
  const downloadInfo = genshinDownloadLinks[detectGenshinPlatform()];

  document.querySelectorAll("[data-genshin-download]").forEach((link) => {
    link.href = downloadInfo.url;
    link.dataset.toast = downloadInfo.tip;

    if (link.dataset.genshinLabel === "auto") {
      link.textContent = downloadInfo.label;
    }

    if (downloadInfo.directDownload) {
      link.setAttribute("download", "");
    } else {
      link.removeAttribute("download");
    }
  });
}

function createClickStar(event) {
  const star = document.createElement("span");
  const size = Math.floor(Math.random() * 20) + 14;

  star.className = "click-star";
  star.style.left = `${event.clientX}px`;
  star.style.top = `${event.clientY}px`;
  star.style.setProperty("--star-size", `${size}px`);
  star.style.setProperty("--star-rotation", `${Math.floor(Math.random() * 72) - 36}deg`);
  star.innerHTML = `
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2.5l3.9 8 8.8 1.3-6.4 6.2 1.5 8.8L16 22.6 8.2 26.8 9.7 18l-6.4-6.2 8.8-1.3z" fill="currentColor"></path>
    </svg>
  `;

  document.body.appendChild(star);
  star.addEventListener("animationend", () => {
    star.remove();
  });
}

function setupClickStars() {
  document.addEventListener("click", createClickStar);
}

setupGenshinDownloadLinks();
setupTestButtons();
setupClickStars();
