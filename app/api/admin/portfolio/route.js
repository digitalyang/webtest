import { getRequestContext } from "../../../../lib/server/cloudflare";
import { handleAdminPortfolioRequest } from "../../../../lib/server/portfolio-admin";
import staticManifest from "../../../../public/assets/data/portfolio.json";

export async function GET(request) {
  const { env } = getRequestContext();
  return handleAdminPortfolioRequest(request, env, staticManifest);
}
