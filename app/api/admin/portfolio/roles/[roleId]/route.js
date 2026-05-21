import { getRequestContext } from "../../../../../../lib/server/cloudflare";
import { handleUpdateRoleRequest } from "../../../../../../lib/server/portfolio-admin";

export async function PATCH(request, { params }) {
  const { env } = getRequestContext();
  const { roleId } = await params;
  return handleUpdateRoleRequest(request, env, roleId);
}
