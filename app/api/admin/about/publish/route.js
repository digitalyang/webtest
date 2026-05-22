import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handlePublishAboutProfileRequest } from "../../../../../lib/server/about-profile";

export async function POST(request) {
  const { env } = getRequestContext();
  return handlePublishAboutProfileRequest(request, env);
}
