import { getRequestContext } from "../../../lib/server/cloudflare";
import { handleMessages } from "../../../lib/server/messages";

export async function GET(request) {
  const { env } = getRequestContext();
  return handleMessages(request, env);
}

export async function POST(request) {
  const { env } = getRequestContext();
  return handleMessages(request, env);
}
