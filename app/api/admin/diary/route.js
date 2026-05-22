import { getRequestContext } from "../../../../lib/server/cloudflare";
import { handleAdminDiaryRequest, handleCreateDiaryRequest } from "../../../../lib/server/diary";

export async function GET(request) {
  const { env } = getRequestContext();
  return handleAdminDiaryRequest(request, env);
}

export async function POST(request) {
  const { env } = getRequestContext();
  return handleCreateDiaryRequest(request, env);
}
