import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleSetCoverRequest } from "../../../../../lib/server/portfolio-admin";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleSetCoverRequest(request, env);
}
