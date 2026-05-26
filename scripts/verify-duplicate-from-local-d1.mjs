import { execSync } from "node:child_process";
import { buildCnPhotoOptions } from "../lib/client/portfolio-cn-options.js";
import { buildVisibilityImageOptions } from "../lib/client/portfolio-visibility-options.js";

const raw = execSync(
  `npx wrangler d1 execute webtest-db --local --command "SELECT id, static_role_id, cloudinary_public_id, filename, legacy_local_src, is_hidden FROM portfolio_static_images WHERE static_role_id = 'hok-daji' ORDER BY id" --json`,
  { cwd: new URL("..", import.meta.url).pathname, encoding: "utf8" }
);

const parsed = JSON.parse(raw);
const rows = parsed?.[0]?.results ?? [];

const snapshot = {
  staticImages: rows,
  adminOptions: {
    works: [{ source: "static", id: "hok", value: "static:hok", label: "HOK" }],
    rolesByWork: {
      "static:hok": [
        {
          source: "static-manifest",
          id: "hok-daji",
          value: "static-manifest:hok-daji",
          label: "Daji"
        }
      ]
    }
  }
};

const visibilityOptions = buildVisibilityImageOptions(snapshot, "static-manifest:hok-daji");
const cnOptions = buildCnPhotoOptions({ workSource: "static", id: "hok-daji" }, snapshot);

console.log("=== 本地 D1 · hok-daji 行 ===");
for (const row of rows) {
  console.log(
    `#${row.id}  ${row.cloudinary_public_id}  filename=${row.filename}  legacy=${row.legacy_local_src ?? "(null)"}`
  );
}

console.log("\n=== 追加图片隐藏下拉 ===");
for (const option of visibilityOptions) {
  console.log(`  ${option.label}  (id=${option.id}, value=${option.value})`);
}

console.log("\n=== CN 出镜名下拉 ===");
for (const option of cnOptions) {
  console.log(`  ${option.label}  (value=${option.value})`);
}

const dupVisibility = visibilityOptions.filter((o) => o.label === "Daji_1.jpeg");
console.log(`\nDaji_1.jpeg 在隐藏下拉出现 ${dupVisibility.length} 次`);
console.log(`Daji_1.jpeg 在 CN 下拉出现 ${cnOptions.filter((o) => o.label === "Daji_1.jpeg").length} 次`);
