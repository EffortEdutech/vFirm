// CE-S7 (ADR-106): a small, read-only Microsoft Graph client for the BizKick document library.
//
// App-only (client credentials). The firm's IT admin registers an app in Microsoft Entra with ONLY the
// Sites.Selected application permission and grants it read access to ONE site; vFirm is then further limited
// in its own code to one folder of one library (see edcs-graph-service.mjs). This client only ever issues GET
// requests plus the token POST, so it cannot change anything in Microsoft 365.
//
// Safety rules kept here: the Graph and login base URLs are fixed (https only; plain http only for a local
// test server); a paging link (@odata.nextLink / @odata.deltaLink) is followed only if it points at the same
// host as the Graph base; ids are checked before they go into a URL; downloads have a byte cap.

const GRAPH_BASE_DEFAULT = "https://graph.microsoft.com/v1.0";
const LOGIN_BASE_DEFAULT = "https://login.microsoftonline.com";
const MAX_PAGES = 50;

export class GraphError extends Error {
  // kind: AUTH_FAILED (the app secret or app id is not accepted), ACCESS_DENIED (consent withdrawn or no access),
  //       NOT_FOUND, GONE (delta token expired), THROTTLED, TOO_LARGE, NETWORK, HTTP
  constructor(kind, message, extra = {}) {
    super(message);
    this.kind = kind;
    Object.assign(this, extra);
  }
}

function checkedBase(value, fallback, label) {
  const url = new URL(value || fallback);
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) throw new Error(`${label} must be https.`);
  return url.toString().replace(/\/+$/, "");
}

export const isSafeId = (value) => typeof value === "string" && /^[A-Za-z0-9!_.\-$]{3,256}$/.test(value);
export const isMicrosoftTenant = (value) => typeof value === "string" && (/^[0-9a-fA-F-]{36}$/.test(value) || /^[A-Za-z0-9.-]{3,100}\.[A-Za-z]{2,}$/.test(value));
export const isGuid = (value) => typeof value === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);

export function createGraphClient({ fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const graphBase = checkedBase(env.VFIRM_GRAPH_BASE_URL, GRAPH_BASE_DEFAULT, "VFIRM_GRAPH_BASE_URL");
  const loginBase = checkedBase(env.VFIRM_GRAPH_LOGIN_BASE_URL, LOGIN_BASE_DEFAULT, "VFIRM_GRAPH_LOGIN_BASE_URL");
  const graphHost = new URL(graphBase).host;

  async function send(url, options, what) {
    let response;
    try {
      response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(25000) });
    } catch (error) {
      throw new GraphError("NETWORK", `Could not reach Microsoft (${what}): ${error?.cause?.code ?? error?.message ?? "network error"}`);
    }
    return response;
  }

  async function failFrom(response, what) {
    let detail = "";
    try { const json = await response.clone().json(); detail = json?.error?.message ?? json?.error_description ?? json?.error?.code ?? ""; } catch {}
    detail = String(detail).slice(0, 300);
    if (response.status === 401) return new GraphError("ACCESS_DENIED", `Microsoft refused the app's access (${what}). ${detail}`.trim(), { status: 401 });
    if (response.status === 403) return new GraphError("ACCESS_DENIED", `Microsoft says the app has no access (${what}). ${detail}`.trim(), { status: 403 });
    if (response.status === 404) return new GraphError("NOT_FOUND", `Not found in Microsoft 365 (${what}). ${detail}`.trim(), { status: 404 });
    if (response.status === 410) return new GraphError("GONE", `The change token has expired (${what}).`, { status: 410 });
    if (response.status === 429) return new GraphError("THROTTLED", `Microsoft asked us to slow down (${what}).`, { status: 429, retry_after: Number(response.headers.get("retry-after")) || null });
    return new GraphError("HTTP", `Microsoft answered ${response.status} (${what}). ${detail}`.trim(), { status: response.status });
  }

  async function getJson(url, token, what) {
    const response = await send(url, { method: "GET", headers: { authorization: `Bearer ${token}`, accept: "application/json" } }, what);
    if (!response.ok) throw await failFrom(response, what);
    return response.json();
  }

  const sameHost = (link) => { try { return new URL(link).host === graphHost; } catch { return false; } };

  return {
    graphBase,
    // Client-credentials token. The secret goes only to the login host, in the POST body.
    async getToken({ msTenantId, clientId, clientSecret }) {
      if (!isMicrosoftTenant(msTenantId) || !isGuid(clientId)) throw new GraphError("AUTH_FAILED", "The Microsoft tenant id or application id is not valid.");
      const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" });
      const response = await send(`${loginBase}/${encodeURIComponent(msTenantId)}/oauth2/v2.0/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body }, "sign in");
      if (!response.ok) {
        let detail = "";
        try { const json = await response.json(); detail = json?.error_description ?? json?.error ?? ""; } catch {}
        if (response.status >= 500 || response.status === 429) throw new GraphError("NETWORK", `Microsoft sign-in is not available right now (${response.status}).`);
        throw new GraphError("AUTH_FAILED", `Microsoft did not accept the app id or secret. ${String(detail).split("\r\n")[0].slice(0, 200)}`.trim());
      }
      const json = await response.json();
      if (!json?.access_token) throw new GraphError("AUTH_FAILED", "Microsoft sign-in returned no access token.");
      return json.access_token;
    },
    // One folder by path (proves the app can see exactly the folder the owner named).
    async getFolder(token, driveId, folderPath) {
      if (!isSafeId(driveId)) throw new GraphError("NOT_FOUND", "The library id is not valid.");
      const encoded = folderPath.split("/").map(encodeURIComponent).join("/");
      const item = await getJson(`${graphBase}/drives/${driveId}/root:/${encoded}`, token, "open the folder");
      if (!item?.folder) throw new GraphError("NOT_FOUND", "That path is a file, not a folder.");
      return item;
    },
    async getItem(token, driveId, itemId) {
      if (!isSafeId(driveId) || !isSafeId(itemId)) throw new GraphError("NOT_FOUND", "Invalid item id.");
      return getJson(`${graphBase}/drives/${driveId}/items/${itemId}`, token, "read an item");
    },
    // All changes since `deltaLink` (or everything, when null). Returns { items, deltaLink }.
    async delta(token, driveId, deltaLink = null) {
      if (!isSafeId(driveId)) throw new GraphError("NOT_FOUND", "The library id is not valid.");
      let url = deltaLink ?? `${graphBase}/drives/${driveId}/root/delta`;
      if (deltaLink && !sameHost(deltaLink)) throw new GraphError("GONE", "The stored change token is not a Microsoft Graph link.");
      const items = [];
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const json = await getJson(url, token, "list changes");
        items.push(...(json.value ?? []));
        if (json["@odata.nextLink"]) {
          if (!sameHost(json["@odata.nextLink"])) throw new GraphError("HTTP", "Microsoft returned a paging link to another host; stopped.");
          url = json["@odata.nextLink"];
          continue;
        }
        if (json["@odata.deltaLink"]) {
          if (!sameHost(json["@odata.deltaLink"])) throw new GraphError("HTTP", "Microsoft returned a change link to another host; stopped.");
          return { items, deltaLink: json["@odata.deltaLink"] };
        }
        throw new GraphError("HTTP", "Microsoft's change list ended without a continuation link.");
      }
      throw new GraphError("HTTP", `More than ${MAX_PAGES} pages of changes; will continue next time.`);
    },
    // Saved versions of a file, newest first (the evidence of which saved version vFirm read).
    async latestVersion(token, driveId, itemId) {
      try {
        const json = await getJson(`${graphBase}/drives/${driveId}/items/${itemId}/versions`, token, "read versions");
        const first = (json.value ?? [])[0];
        return first ? { id: String(first.id ?? ""), modified: first.lastModifiedDateTime ?? null } : null;
      } catch { return null; }
    },
    async download(token, driveId, itemId, maxBytes) {
      if (!isSafeId(driveId) || !isSafeId(itemId)) throw new GraphError("NOT_FOUND", "Invalid item id.");
      const response = await send(`${graphBase}/drives/${driveId}/items/${itemId}/content`, { method: "GET", headers: { authorization: `Bearer ${token}` }, redirect: "follow" }, "download a file");
      if (!response.ok) throw await failFrom(response, "download a file");
      const declared = Number(response.headers.get("content-length"));
      if (declared && declared > maxBytes) throw new GraphError("TOO_LARGE", `The file is ${declared} bytes; the limit is ${maxBytes}.`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > maxBytes) throw new GraphError("TOO_LARGE", `The file is ${buffer.length} bytes; the limit is ${maxBytes}.`);
      return buffer;
    }
  };
}
