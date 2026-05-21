import { getRequestContext } from "../../../../../../lib/server/cloudflare";
import { handleImageUploadPlanRequest } from "../../../../../../lib/server/portfolio-admin";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleImageUploadPlanRequest(request, env);
}
