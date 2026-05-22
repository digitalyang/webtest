import { getRequestContext } from "../../../../../lib/server/cloudflare";
import { handleDeleteDiaryRequest, handleUpdateDiaryRequest } from "../../../../../lib/server/diary";

export async function PUT(request, context) {
  const { env } = getRequestContext();
  const { entryId } = await context.params;
  return handleUpdateDiaryRequest(request, env, entryId);
}

export async function DELETE(request, context) {
  const { env } = getRequestContext();
  const { entryId } = await context.params;
  return handleDeleteDiaryRequest(request, env, entryId);
}
