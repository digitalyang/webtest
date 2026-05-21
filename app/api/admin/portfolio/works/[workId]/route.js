import { getRequestContext } from "../../../../../../lib/server/cloudflare";
import { handleUpdateWorkRequest } from "../../../../../../lib/server/portfolio-admin";

export async function PATCH(request, { params }) {
  const { env } = getRequestContext();
  const { workId } = await params;
  return handleUpdateWorkRequest(request, env, workId);
}
