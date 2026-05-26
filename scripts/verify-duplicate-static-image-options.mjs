import { buildCnPhotoOptions } from "../lib/client/portfolio-cn-options.js";
import { buildVisibilityImageOptions } from "../lib/client/portfolio-visibility-options.js";

const snapshot = {
  staticImages: [
    {
      id: 99,
      static_work_id: "hok",
      static_role_id: "hok-daji",
      cloudinary_public_id: "webtest/portfolio-covers/hok/daji/daji_1",
      filename: "Daji_1.jpeg",
      legacy_local_src: null,
      is_hidden: 0
    },
    {
      id: 15,
      static_work_id: "hok",
      static_role_id: "hok-daji",
      cloudinary_public_id: "webtest/portfolio/hok/daji/daji_1",
      filename: "Daji_1.jpeg",
      legacy_local_src: "assets/images/HOK/Daji/Daji_1.jpeg",
      is_hidden: 0
    }
  ],
  adminOptions: {
    works: [{ source: "static", id: "hok", value: "static:hok", label: "HOK" }],
    rolesByWork: {
      "static:hok": [
        {
          source: "static-manifest",
          workSource: "static",
          id: "hok-daji",
          value: "static-manifest:hok-daji",
          label: "Daji"
        }
      ]
    }
  }
};

const roleKey = "static-manifest:hok-daji";

const visibilityOptions = buildVisibilityImageOptions(snapshot, roleKey);
const cnOptions = buildCnPhotoOptions({ workSource: "static", id: "hok-daji" }, snapshot);

console.log("=== D1 rows (simulated) ===");
for (const row of snapshot.staticImages) {
  console.log(`#${row.id}  ${row.cloudinary_public_id}  filename=${row.filename}`);
}

console.log("\n=== 追加图片 · 隐藏下拉 (buildVisibilityImageOptions) ===");
console.log(visibilityOptions.map((o) => `${o.label}  value=${o.value}`).join("\n") || "(empty)");

console.log("\n=== CN 出镜名下拉 (buildCnPhotoOptions) ===");
console.log(cnOptions.map((o) => `${o.label}  value=${o.value}`).join("\n") || "(empty)");

console.log("\n=== 结论 ===");
if (visibilityOptions.filter((o) => o.label.startsWith("Daji_1")).length > 1) {
  console.log("根因确认：visibility 未过滤 portfolio-covers，同名 filename 出现两次。");
}
if (cnOptions.filter((o) => o.label.startsWith("Daji_1")).length <= 1) {
  console.log("CN 下拉已过滤 cover-only，通常只显示一条。");
}
