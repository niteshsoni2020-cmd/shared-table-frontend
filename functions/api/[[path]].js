function readUpstream(env) {
  const value = String((env && env.API_ORIGIN) || "").trim().replace(/\/$/, "");
  return value;
}

function errorJson(status, code) {
  return new Response(JSON.stringify({ ok: false, error: code }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequest(context) {
  const upstreamBase = readUpstream(context.env);
  if (!upstreamBase) {
    return errorJson(500, "API_ORIGIN_NOT_CONFIGURED");
  }

  const incomingUrl = new URL(context.request.url);
  const upstreamOrigin = new URL(upstreamBase);

  if (incomingUrl.host === upstreamOrigin.host) {
    return errorJson(500, "API_ORIGIN_RECURSIVE_HOST");
  }

  const upstreamUrl = upstreamBase + incomingUrl.pathname + incomingUrl.search;
  const requestHeaders = new Headers(context.request.headers);
  requestHeaders.set("host", upstreamOrigin.host);
  requestHeaders.set("x-forwarded-host", incomingUrl.host);
  requestHeaders.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  const method = String(context.request.method || "GET").toUpperCase();
  const init = {
    method,
    headers: requestHeaders,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await context.request.arrayBuffer();
  }

  const upstreamResponse = await fetch(upstreamUrl, init);
  const headers = new Headers(upstreamResponse.headers);
  headers.set("cache-control", "no-store");

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}
