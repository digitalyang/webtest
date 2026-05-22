"use client";

import { useMemo, useState } from "react";
import { getImageBatch, resolveImageSrc, ROLE_IMAGE_BATCH_SIZE, withoutThumbnails } from "../../lib/portfolio";

export default function RoleImageLoader({ images = [] }) {
  const originals = useMemo(() => withoutThumbnails(images), [images]);
  const [loaded, setLoaded] = useState(Math.min(ROLE_IMAGE_BATCH_SIZE, originals.length));
  const visibleImages = getImageBatch(originals, 0, loaded);
  const remaining = originals.length - loaded;

  function loadNextBatch() {
    setLoaded((current) => Math.min(current + ROLE_IMAGE_BATCH_SIZE, originals.length));
  }

  return (
    <>
      <div className="portfolio-grid portfolio-original-grid" id="roleImageGrid">
        {visibleImages.map((image) => (
          <a
            key={image.src}
            className="portfolio-thumb portfolio-original-thumb portfolio-fit-contain"
            href={resolveImageSrc(image.src)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={resolveImageSrc(image.src)} alt={image.alt} loading="lazy" width="480" height="640" />
          </a>
        ))}
      </div>
      <div className="portfolio-load-more">
        <button className="button" type="button" id="loadMoreImages" hidden={remaining <= 0} onClick={loadNextBatch}>
          继续加载 {Math.min(ROLE_IMAGE_BATCH_SIZE, remaining)} 张
        </button>
        <p className="muted" id="loadStatus">
          {remaining <= 0 ? "已加载全部图片" : `已加载 ${loaded} / ${originals.length} 张`}
        </p>
      </div>
    </>
  );
}
