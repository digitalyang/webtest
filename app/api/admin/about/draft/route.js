import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleSaveAboutDraftRequest } from "../../../../../lib/server/about-profile";

export async function PUT(request) {
  const { env } = getRequestContext();
  return handleSaveAboutDraftRequest(request, env);
}
