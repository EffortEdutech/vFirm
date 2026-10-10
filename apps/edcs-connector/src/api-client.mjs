// CE-S6 (ADR-101): the connector's calls to vFirm.
//
// Every call carries the connector token. Failures are classified so the agent knows what to do:
//   NETWORK     the request never got an answer (offline, DNS, timeout)      -> retry later
//   SERVER      5xx, or a 409 that the owner can fix (not connected yet)      -> retry later
//   REVOKED     401: the token is invalid, rotated away or the connector is revoked -> stop sending
//   REJECTED    other 4xx: vFirm refuses this delivery as sent                -> dead-letter it

export class ApiError extends Error {
  constructor(kind, message, { status = null, code = null } = {}) {
    super(message);
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export function createApiClient({ baseUrl, token, timeoutMs = 30000, fetchImpl = globalThis.fetch }) {
  async function post(path, body) {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-vfirm-connector-token": token },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (error) {
      throw new ApiError("NETWORK", `Cannot reach vFirm (${error?.cause?.code ?? error?.name ?? "network error"}).`);
    }
    const json = await response.json().catch(() => null);
    if (response.ok && json?.ok !== false) return json?.data ?? json;
    const code = json?.error?.code ?? null;
    const message = json?.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 401) throw new ApiError("REVOKED", message, { status: 401, code });
    if (response.status >= 500 || response.status === 409 || response.status === 429 || response.status === 408) throw new ApiError("SERVER", message, { status: response.status, code });
    throw new ApiError("REJECTED", message, { status: response.status, code });
  }
  return {
    heartbeat: (body) => post("/edcs/connector/heartbeat", body),
    syncRegister: (body) => post("/edcs/sync", body),
    syncFile: (body) => post("/edcs/sync/file", body),
    // CE-S8: approved drafts waiting for the outbox, and the acknowledgement once a file is placed.
    outbox: () => post("/edcs/connector/outbox", {}),
    outboxAck: (body) => post("/edcs/connector/outbox/ack", body)
  };
}
