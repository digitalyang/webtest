const genshinDownloadButton = document.querySelector("#genshinDownloadButton");
let genshinDownloadTip = "正在打开原神官方下载页面。";

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
    label: "下载原神",
    url: "https://ys.mihoyo.com/main/",
    tip: "当前设备暂无匹配安装包，正在打开原神官方下载页面。",
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

function setupGenshinDownloadButton() {
  if (!genshinDownloadButton) {
    return;
  }

  const downloadInfo = genshinDownloadLinks[detectGenshinPlatform()];
  genshinDownloadButton.textContent = downloadInfo.label;
  genshinDownloadButton.href = downloadInfo.url;
  genshinDownloadTip = downloadInfo.tip;

  if (downloadInfo.directDownload) {
    genshinDownloadButton.setAttribute("download", "");
  } else {
    genshinDownloadButton.removeAttribute("download");
  }

  genshinDownloadButton.addEventListener("click", () => {
    showToast(genshinDownloadTip);
  });
}

setupGenshinDownloadButton();
