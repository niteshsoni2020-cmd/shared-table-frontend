const BLOCKED_EXACT = new Set([
  "/RUNTIME_CONFIG.md",
  "/_redirects",
  "/_routes.json",
]);

const BLOCKED_PREFIXES = [
  "/scripts/",
];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = String(url.pathname || "");

  if (BLOCKED_EXACT.has(path) || BLOCKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  return context.next();
}
