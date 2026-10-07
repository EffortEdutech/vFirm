// Vercel entry point (ADR-104). One Vercel project serves the console (static files in dist/) and the API.
// vercel.json rewrites /api/<anything> to this function as /api/index?__vf_path=<anything>; the real API route
// is rebuilt here so apps/api/src/server.mjs sees exactly the URL it sees on a normal host (/health, /edcs/sync, ...).
// The API address for connectors and the daily schedule is therefore https://<your-domain>/api.

import { handleRequest } from "../apps/api/src/server.mjs";

export const config = { maxDuration: 60 };

export function rebuildUrl(rawUrl) {
  const url = new URL(rawUrl ?? "/", "http://placeholder.invalid");
  let path;
  if (url.searchParams.has("__vf_path")) {
    path = "/" + String(url.searchParams.get("__vf_path") ?? "").replace(/^\/+/, "");
    url.searchParams.delete("__vf_path");
  } else {
    path = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  }
  if (path === "/index") path = "/";
  const query = url.searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export default function handler(req, res) {
  req.url = rebuildUrl(req.url);
  return handleRequest(req, res);
}
