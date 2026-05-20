import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getRequestContext() {
  const { env, cf } = getCloudflareContext();
  return { env, cf };
}
