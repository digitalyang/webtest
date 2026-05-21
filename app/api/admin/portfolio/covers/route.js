import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleSetCoverRequest } from "../../../../../lib/server/portfolio-admin";
import staticManifest from "../../../../../public/assets/data/portfolio.json";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleSetCoverRequest(request, env, staticManifest);
}
