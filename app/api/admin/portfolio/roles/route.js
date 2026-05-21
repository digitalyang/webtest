import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleCreateRoleRequest } from "../../../../../lib/server/portfolio-admin";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleCreateRoleRequest(request, env);
}
