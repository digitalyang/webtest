import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleSetImageCreditRequest } from "../../../../../lib/server/portfolio-admin";

export async function POST(request) {
  const { env } = getRequestContext();
  return handleSetImageCreditRequest(request, env);
}
