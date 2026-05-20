"use client";

import { useState } from "react";
import { getShuffledMemes } from "../lib/nailong";

export default function NailongMeme() {
  const [imageUrl, setImageUrl] = useState("");
  const [lastMemeUrl, setLastMemeUrl] = useState("");
  const [status, setStatus] = useState("等待获取奶龙表情包。");
  const [loading, setLoading] = useState(false);

  function loadMemeFromNetwork(candidates) {
    const [nextUrl, ...restUrls] = candidates;

    if (!nextUrl) {
      setStatus("获取失败，可能是网络或图片站点限制，请稍后再试。");
      setLoading(false);
      return;
    }

    const previewImage = new Image();
    previewImage.referrerPolicy = "no-referrer";

    previewImage.onload = () => {
      setImageUrl(nextUrl);
      setStatus("已从网络获取一张奶龙表情包。");
      setLastMemeUrl(nextUrl);
      setLoading(false);
    };

    previewImage.onerror = () => {
      loadMemeFromNetwork(restUrls);
    };

    previewImage.src = nextUrl;
  }

  function loadMeme() {
    setLoading(true);
    setStatus("正在从网络加载奶龙表情包...");

    const candidates = getShuffledMemes().filter((url) => url !== lastMemeUrl);
    loadMemeFromNetwork(candidates.length > 0 ? candidates : getShuffledMemes());
  }

  return (
    <section className="meme-panel">
      <div className="meme-copy">
        <span className="badge">Nailong Meme Fetcher</span>
        <h1>随机获取一张奶龙表情包</h1>
        <p>
          点击按钮后，页面会从独立脚本里的图片池随机加载一张奶龙表情包。后续可以直接在 <strong>lib/nailong.js</strong> 里补充 WebP 或 GIF 直链。
        </p>
        <button className="button" type="button" disabled={loading} onClick={loadMeme}>
          {loading ? "正在获取..." : imageUrl ? "再获取一张" : "从网络获取一张"}
        </button>
      </div>
      <div className={`meme-stage${imageUrl ? " has-image" : ""}`}>
        <div className="meme-placeholder">点击左侧按钮开始获取</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl || undefined} alt="随机奶龙表情包" referrerPolicy="no-referrer" />
        <p id="memeStatus">{status}</p>
      </div>
    </section>
  );
}
