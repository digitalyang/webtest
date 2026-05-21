import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleCreateImagesRequest } from "../../../../../lib/server/portfolio-admin";
import staticManifest from "../../../../../public/assets/data/portfolio.json";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleCreateImagesRequest(request, env, staticManifest);
}
