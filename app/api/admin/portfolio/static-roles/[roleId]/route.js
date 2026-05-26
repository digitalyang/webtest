import { getRequestContext } from "../../../../../../lib/server/cloudflare";
import { handleUpdateStaticRoleRequest } from "../../../../../../lib/server/portfolio-admin";

export async function PATCH(request, context) {
  const { env } = getRequestContext();
  const { roleId } = await context.params;
  return handleUpdateStaticRoleRequest(request, env, roleId);
}
