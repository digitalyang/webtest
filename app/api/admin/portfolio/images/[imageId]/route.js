import { getRequestContext } from "../../../../../../lib/server/cloudflare";
import { handleUpdateImageRequest } from "../../../../../../lib/server/portfolio-admin";

export async function PATCH(request, { params }) {
  const { env } = getRequestContext();
  const { imageId } = await params;
  return handleUpdateImageRequest(request, env, imageId);
}
