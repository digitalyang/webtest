import { getRequestContext } from "../../../../../../lib/server/cloudflare";
import { handleImageUploadPlanRequest } from "../../../../../../lib/server/portfolio-admin";
import staticManifest from "../../../../../../public/assets/data/portfolio.json";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleImageUploadPlanRequest(request, env, staticManifest);
}
