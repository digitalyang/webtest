import { NextResponse } from "next/server";

export function GET(request) {
  const url = new URL(request.url);
  const workId = url.searchParams.get("id");
  const destination = workId ? `/portfolio/work/${encodeURIComponent(workId)}` : "/portfolio";

  return NextResponse.redirect(new URL(destination, request.url), 308);
}
