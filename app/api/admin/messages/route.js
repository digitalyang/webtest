import { getRequestContext } from "../../../../lib/server/cloudflare";
import { handleAdminMessagesRequest } from "../../../../lib/server/message-admin";

export async function GET(request) {
  const { env } = getRequestContext();
  return handleAdminMessagesRequest(request, env);
}
