import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleCreateImagesRequest } from "../../../../../lib/server/portfolio-admin";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleCreateImagesRequest(request, env);
}
