import { NextResponse } from "next/server";

export function GET(request) {
  const url = new URL(request.url);
  const roleId = url.searchParams.get("id");
  const destination = roleId ? `/portfolio/role/${encodeURIComponent(roleId)}` : "/portfolio";

  return NextResponse.redirect(new URL(destination, request.url), 308);
}
