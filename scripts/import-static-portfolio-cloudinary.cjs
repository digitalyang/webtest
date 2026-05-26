#!/usr/bin/env node

const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_DATABASE_NAME = "webtest-db";
const GALLERY_PUBLIC_ID_PREFIX = "webtest/portfolio";

function parseDotVars(contents = "") {
  const values = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    values[match[1]] = stripQuotes(match[2].trim());
  }

  return values;
}

function buildCoverThumbUrl(cloudName, publicId) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_fill,w_480,f_webp,q_auto/${publicId}.webp`;
}

function buildGalleryPublicId(staticWorkId, roleSlug, sortOrder) {
  return `${GALLERY_PUBLIC_ID_PREFIX}/${staticWorkId}/${roleSlug}/${roleSlug}_${sortOrder}`;
}

function buildGallerySourceUrl(cloudName, publicId, format = "webp") {
  return `https://res.cloudinary.com/${cloudName}/image/upload/v1/${publicId}.${format}`;
}

function buildImportRecords({ manifest, rootDir, cloudName, skipMissing = false }) {
  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME is required.");
  }

  const records = [];
  const missingFiles = [];
  const works = Array.isArray(manifest?.photographyWorks) ? manifest.photographyWorks : [];

  for (const work of works) {
    const staticWorkId = cleanRequired(work?.id, "Static work id is required.");
    const roles = Array.isArray(work?.roles) ? work.roles : [];

    for (const role of roles) {
      const staticRoleId = cleanRequired(role?.id, "Static role id is required.");
      const roleSlug = getRoleSlug(staticWorkId, role);
      const images = Array.isArray(role?.images) ? role.images : [];

      for (const [index, image] of images.entries()) {
        const src = cleanRequired(image?.src, "Static image src is required.");
        const localPath = resolveStaticImagePath(rootDir, src);

        if (!fs.existsSync(localPath)) {
          missingFiles.push({ staticWorkId, staticRoleId, src, localPath });
          continue;
        }

        const sortOrder = index + 1;
        const filename = path.basename(src);
        const publicId = buildGalleryPublicId(staticWorkId, roleSlug, sortOrder);
        const placeholderFormat = deliveryExtension(filename) === "png" ? "png" : deliveryExtension(filename) === "webp" ? "webp" : "jpg";

        records.push({
          staticWorkId,
          staticRoleId,
          publicId,
          legacyLocalSrc: src,
          secureUrl: buildGallerySourceUrl(cloudName, publicId, placeholderFormat),
          coverThumbUrl: buildCoverThumbUrl(cloudName, publicId),
          filename,
          alt: image?.alt || `${work?.title || staticWorkId} ${role?.title || roleSlug} ${sortOrder}`,
          width: null,
          height: null,
          format: null,
          bytes: null,
          sortOrder,
          localPath
        });
      }
    }
  }

  if (missingFiles.length > 0 && !skipMissing) {
    const firstMissing = missingFiles[0];
    throw new Error(`Missing local static image: ${firstMissing.localPath}`);
  }

  return {
    records,
    missingFiles
  };
}

function buildUpsertSql(records = []) {
  if (records.length === 0) {
    return "-- No static portfolio images to import.\n";
  }

  const statements = records.map((record) => `INSERT INTO portfolio_static_images (
  static_work_id,
  static_role_id,
  cloudinary_public_id,
  secure_url,
  cover_thumb_url,
  filename,
  alt,
  width,
  height,
  format,
  bytes,
  sort_order,
  legacy_local_src
) VALUES (
  ${sqlValue(record.staticWorkId)},
  ${sqlValue(record.staticRoleId)},
  ${sqlValue(record.publicId)},
  ${sqlValue(record.secureUrl)},
  ${sqlValue(record.coverThumbUrl)},
  ${sqlValue(record.filename)},
  ${sqlValue(record.alt)},
  ${sqlValue(record.width)},
  ${sqlValue(record.height)},
  ${sqlValue(record.format)},
  ${sqlValue(record.bytes)},
  ${sqlValue(record.sortOrder)},
  ${sqlValue(record.legacyLocalSrc)}
)
ON CONFLICT(cloudinary_public_id) DO UPDATE SET
  static_work_id = excluded.static_work_id,
  static_role_id = excluded.static_role_id,
  secure_url = excluded.secure_url,
  cover_thumb_url = excluded.cover_thumb_url,
  filename = excluded.filename,
  alt = excluded.alt,
  width = excluded.width,
  height = excluded.height,
  format = excluded.format,
  bytes = excluded.bytes,
  sort_order = excluded.sort_order,
  legacy_local_src = excluded.legacy_local_src,
  updated_at = CURRENT_TIMESTAMP;`);

  return [...statements, buildCreditsMigrationSql(records), ""].join("\n");
}

function buildCreditsMigrationSql(records = []) {
  const statements = records
    .filter((record) => record.legacyLocalSrc)
    .map(
      (record) => `UPDATE portfolio_image_credits
SET image_source = 'static-image',
    image_key = (
      SELECT CAST(id AS TEXT)
      FROM portfolio_static_images
      WHERE legacy_local_src = ${sqlValue(record.legacyLocalSrc)}
      LIMIT 1
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE image_source = 'static-local'
  AND image_key = ${sqlValue(record.legacyLocalSrc)};`
    );

  if (statements.length === 0) {
    return "-- No static-local credits to migrate.\n";
  }

  return statements.join("\n");
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    remote: false,
    local: false,
    skipMissing: false,
    databaseName: DEFAULT_DATABASE_NAME,
    rootDir: path.resolve(__dirname, ".."),
    manifestPath: undefined
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--remote") options.remote = true;
    else if (arg === "--local") options.local = true;
    else if (arg === "--skip-missing") options.skipMissing = true;
    else if (arg === "--database") options.databaseName = readArgValue(argv, ++index, "--database");
    else if (arg === "--root") options.rootDir = path.resolve(readArgValue(argv, ++index, "--root"));
    else if (arg === "--manifest") options.manifestPath = path.resolve(readArgValue(argv, ++index, "--manifest"));
    else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (options.local && options.remote) {
    throw new Error("Use only one of --local or --remote.");
  }

  if (!options.local && !options.remote) {
    options.local = true;
  }

  if (!options.manifestPath) {
    options.manifestPath = path.join(options.rootDir, "public/assets/data/portfolio.json");
  }

  return options;
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  const env = loadLocalEnv(options.rootDir);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || env.CLOUDINARY_UPLOAD_PRESET;
  const manifest = JSON.parse(fs.readFileSync(options.manifestPath, "utf8"));
  const { records, missingFiles } = buildImportRecords({
    manifest,
    rootDir: options.rootDir,
    cloudName: cloudName || "CLOUDINARY_CLOUD_NAME",
    skipMissing: options.skipMissing
  });

  if (missingFiles.length > 0) {
    console.warn(`Skipped ${missingFiles.length} missing local files.`);
  }

  console.log(`Prepared ${records.length} static portfolio image records.`);

  if (options.dryRun) {
    printDryRun(records, missingFiles);
    return;
  }

  if (!cloudName || !uploadPreset) {
    throw new Error("CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET are required for real imports.");
  }

  const { prepareLocalImageForUpload } = await import("../lib/portfolio-image-processing.js");
  const uploadedRecords = [];
  for (const [index, record] of records.entries()) {
    console.log(`Uploading ${index + 1}/${records.length}: ${record.publicId}`);
    uploadedRecords.push(await uploadRecord(record, { cloudName, uploadPreset, prepareLocalImageForUpload }));
  }

  const sql = buildUpsertSql(uploadedRecords);
  executeD1Sql(sql, {
    rootDir: options.rootDir,
    databaseName: options.databaseName,
    remote: options.remote
  });
  console.log(`Imported ${uploadedRecords.length} static portfolio images into ${options.remote ? "remote" : "local"} D1.`);
}

async function uploadRecord(record, { cloudName, uploadPreset, prepareLocalImageForUpload }) {
  const response = await uploadToCloudinary(record, { cloudName, uploadPreset, prepareLocalImageForUpload });

  return {
    ...record,
    secureUrl: response.secure_url || record.secureUrl,
    width: response.width ?? record.width,
    height: response.height ?? record.height,
    format: response.format ?? record.format,
    bytes: response.bytes ?? record.bytes
  };
}

async function uploadToCloudinary(record, { cloudName, uploadPreset, prepareLocalImageForUpload }) {
  const prepared = await prepareLocalImageForUpload(record.localPath);
  const formData = new FormData();
  formData.append("file", new Blob([prepared.buffer], { type: prepared.mimeType }), prepared.filename);
  formData.append("upload_preset", uploadPreset);
  formData.append("public_id", record.publicId);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });
  const data = await response.json().catch(() => ({}));

  if (response.ok) {
    return data;
  }

  const message = data?.error?.message || `Cloudinary upload failed with status ${response.status}`;
  if (/already exists/i.test(message)) {
    console.warn(`Cloudinary asset already exists, keeping derived URL: ${record.publicId}`);
    return {};
  }

  throw new Error(message);
}

function executeD1Sql(sql, { rootDir, databaseName, remote }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-static-import-"));
  const sqlPath = path.join(tempDir, "import.sql");

  try {
    fs.writeFileSync(sqlPath, sql);
    const args = [
      "wrangler",
      "d1",
      "execute",
      databaseName,
      remote ? "--remote" : "--local",
      "--file",
      sqlPath
    ];
    const result = childProcess.spawnSync("npx", args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    if (result.status !== 0) {
      throw new Error(`wrangler d1 execute failed with status ${result.status}`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function loadLocalEnv(rootDir) {
  const envPath = path.join(rootDir, ".dev.vars");
  if (!fs.existsSync(envPath)) return {};
  return parseDotVars(fs.readFileSync(envPath, "utf8"));
}

function printDryRun(records, missingFiles) {
  for (const record of records) {
    console.log(`${record.staticRoleId} #${record.sortOrder}: ${record.publicId} <- ${record.localPath}`);
  }

  if (missingFiles.length > 0) {
    console.log("Missing files:");
    for (const file of missingFiles) {
      console.log(`${file.staticRoleId}: ${file.localPath}`);
    }
  }
}

function printHelp() {
  console.log(`Usage: node scripts/import-static-portfolio-cloudinary.cjs [options]

Options:
  --dry-run          Print planned imports without uploading or writing D1
  --local            Write to local D1 (default)
  --remote           Write to remote D1
  --skip-missing     Skip manifest images whose local files are missing
  --database <name>  D1 database name (default: ${DEFAULT_DATABASE_NAME})
  --root <path>      Project root (default: repository root)
  --manifest <path>  Portfolio manifest path
`);
}

function resolveStaticImagePath(rootDir, src) {
  const cleanSrc = String(src).replace(/^\/+/, "");
  return path.resolve(rootDir, "public", cleanSrc);
}

function getRoleSlug(staticWorkId, role) {
  const roleId = cleanRequired(role?.id, "Static role id is required.");
  const prefix = `${staticWorkId}-`;
  if (roleId.startsWith(prefix)) {
    return roleId.slice(prefix.length);
  }

  return slug(role?.title || roleId);
}

function deliveryExtension(filename) {
  const extension = path.extname(filename).slice(1).toLowerCase();
  return extension || "jpg";
}

function sqlValue(value) {
  if (value == null) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanRequired(value, message) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error(message);
  }

  return text;
}

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readArgValue(argv, index, name) {
  if (index >= argv.length || argv[index].startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }

  return argv[index];
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildCoverThumbUrl,
  buildGalleryPublicId,
  buildImportRecords,
  buildUpsertSql,
  buildCreditsMigrationSql,
  parseArgs,
  parseDotVars
};
