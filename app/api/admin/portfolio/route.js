import { getRequestContext } from "../../../../lib/server/cloudflare";
import { handleAdminPortfolioRequest } from "../../../../lib/server/portfolio-admin";

export async function GET(request) {
  const { env } = getRequestContext();
  return handleAdminPortfolioRequest(request, env);
}
