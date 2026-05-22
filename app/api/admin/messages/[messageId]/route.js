import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleDeleteAdminMessageRequest } from "../../../../../lib/server/message-admin";

export async function DELETE(request, { params }) {
  const { env } = getRequestContext();
  const { messageId } = await params;
  return handleDeleteAdminMessageRequest(request, env, messageId);
}
