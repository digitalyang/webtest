const blockedPaths = [
  /^\/package(?:-lock)?\.json$/,
  /^\/wrangler\.toml$/,
  /^\/migrations\//,
  /^\/node_modules\//
];

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (blockedPaths.some((pattern) => pattern.test(url.pathname))) {
    return new Response("Not found", { status: 404 });
  }

  return context.next();
}
