import { getRequestContext } from "../../../../lib/server/cloudflare";
import { clearAdminSessionCookie, createAdminSessionCookie, verifyAdminLogin } from "../../../../lib/server/admin-auth";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store"
};

export async function POST(request) {
  const { env } = getRequestContext();
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "请求内容不是有效 JSON。" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  if (!(await verifyAdminLogin(body, env))) {
    return Response.json({ error: "管理员验证失败。" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": await createAdminSessionCookie(env),
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function DELETE() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": clearAdminSessionCookie(),
        "Cache-Control": "no-store"
      }
    }
  );
}
