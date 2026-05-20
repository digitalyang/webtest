export const genshinDownloadLinks = {
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

export function detectGenshinPlatform() {
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
