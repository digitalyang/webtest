import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleCreateWorkRequest } from "../../../../../lib/server/portfolio-admin";
import manifest from "../../../../../public/assets/data/portfolio.json";

const staticWorkIds = (manifest.photographyWorks || []).map((work) => work.id);

export async function POST(request) {
  const { env } = getRequestContext();
  return handleCreateWorkRequest(request, env, staticWorkIds);
}
