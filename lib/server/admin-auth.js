const ADMIN_COOKIE_NAME = "portfolio_admin";
const SESSION_TTL_SECONDS = 4 * 60 * 60;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hasAdminAuthConfig(env) {
  return Boolean(env?.ADMIN_PASSWORD_HASH);
}

async function createSessionSignature(expiresAt, env) {
  return sha256(`${expiresAt}:${env.ADMIN_PASSWORD_HASH}`);
}

export async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

export async function hashAdminPassword(password) {
  return sha256(`portfolio-admin:${password}`);
}

export async function verifyAdminLogin(body, env) {
  if (!hasAdminAuthConfig(env) || typeof body?.password !== "string") {
    return false;
  }

  return (await hashAdminPassword(body.password)) === env.ADMIN_PASSWORD_HASH;
}

export async function createAdminSessionValue(env, now = Date.now()) {
  const expiresAt = now + SESSION_TTL_MS;
  const signature = await createSessionSignature(expiresAt, env);
  return `${expiresAt}.${signature}`;
}

export async function createAdminSessionCookie(env, now = Date.now()) {
  const value = await createAdminSessionValue(env, now);
  return `${ADMIN_COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export async function isValidAdminSession(value, env, now = Date.now()) {
  if (!value || !env?.ADMIN_PASSWORD_HASH) {
    return false;
  }

  const parts = String(value).split(".");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[1])) {
    return false;
  }

  const expiresAt = Number(parts[0]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false;
  }

  return parts[1] === await createSessionSignature(expiresAt, env);
}

export function getAdminSessionCookie(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return "";
  }

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === ADMIN_COOKIE_NAME) {
      return valueParts.join("=");
    }
  }

  return "";
}

export async function requireAdminSession(request, env) {
  return isValidAdminSession(getAdminSessionCookie(request), env);
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
