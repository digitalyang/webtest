import { getRequestContext } from "../../../lib/server/cloudflare";
import { handleStats } from "../../../lib/server/stats";

export async function POST(request) {
  const { env, cf } = getRequestContext();
  return handleStats(request, env, cf);
}
