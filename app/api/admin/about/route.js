import { getRequestContext } from "../../../../lib/server/cloudflare";
import { handleAdminAboutRequest } from "../../../../lib/server/about-profile";

export async function GET(request) {
  const { env } = getRequestContext();
  return handleAdminAboutRequest(request, env);
}
