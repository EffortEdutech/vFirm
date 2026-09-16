// Shared render helpers. Nothing here is page-specific -- these are the
// building blocks pages-owner.js / pages-admin.js compose. The generic
// "inspector" at the bottom exists because several backend response shapes
// are unverified (see README) -- it renders whatever JSON comes back as
// labeled rows instead of guessing field names.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child === undefined || child === null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

export function pill(text, tone = "default") {
  return `<span class="pill pill-${tone}">${escapeHtml(text)}</span>`;
}

const STATUS_TONE = {
  active: "moss", ready: "moss", sent: "moss", delivered: "moss", approved: "moss", ok: "moss", healthy: "moss",
  paused: "amber", pending: "amber", drafting: "amber", awaiting: "amber", in_progress: "amber", review: "amber",
  blocked: "rose", failed: "rose", error: "rose", rejected: "rose", stuck: "rose", overdue: "rose",
};

export function statusPill(status) {
  const raw = String(status ?? "unknown");
  const tone = STATUS_TONE[raw.toLowerCase()] ?? "default";
  return pill(raw.replace(/_/g, " "), tone);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function fmtMoney(value, currency = "MYR") {
  if (value === undefined || value === null || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `${currency} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function empty(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

export function panel(title, bodyHtml, actionsHtml = "") {
  return `<section class="panel"><div class="panel-head"><h3>${escapeHtml(title)}</h3><div class="panel-actions">${actionsHtml}</div></div><div class="panel-body">${bodyHtml}</div></section>`;
}

export function tabBar(tabs, activeId, onSelectAttr) {
  return `<div class="tabbar" role="tablist">${tabs
    .map((t) => `<button class="tab${t.id === activeId ? " active" : ""}" data-${onSelectAttr}="${escapeHtml(t.id)}" type="button">${escapeHtml(t.label)}${t.count !== undefined ? ` <span class="tab-count">${t.count}</span>` : ""}</button>`)
    .join("")}</div>`;
}

export function statRow(stats) {
  return `<div class="stat-row">${stats
    .map((s) => `<div class="stat"><span class="stat-value">${escapeHtml(String(s.value))}</span><span class="stat-label">${escapeHtml(s.label)}</span></div>`)
    .join("")}</div>`;
}

export function table(columns, rows, rowKey = () => "") {
  if (!rows.length) return empty("Nothing here yet.");
  return `<table><thead><tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr data-row-key="${escapeHtml(rowKey(row))}">${columns.map((c) => `<td>${c.render ? c.render(row) : escapeHtml(row[c.key] ?? "—")}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

export function errorBox(err, context) {
  return `<div class="error-box"><strong>Could not load ${escapeHtml(context)}.</strong><br>${escapeHtml(err?.message ?? String(err))}${err?.code ? `<br><code>${escapeHtml(err.code)}</code>` : ""}</div>`;
}

// ---- generic inspector -----------------------------------------------
// Renders arbitrary JSON as labeled key/value rows (objects) or a table
// (arrays of objects), recursing one level deep. This is the deliberate
// fallback for every page whose backend response shape I have not
// confirmed against a running server (see README "what's real vs
// pending verification").

export function inspector(data, opts = {}) {
  const label = opts.label ? `<div class="field-note">${escapeHtml(opts.label)}</div>` : "";
  if (data === undefined || data === null) return label + empty("No data returned.");
  if (Array.isArray(data)) {
    if (!data.length) return label + empty("Empty list.");
    if (typeof data[0] === "object" && data[0] !== null) {
      const keys = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
      return label + table(
        keys.map((k) => ({ key: k, label: k.replace(/_/g, " ") })),
        data.map((row) => Object.fromEntries(keys.map((k) => [k, formatCell(row[k])])))
      );
    }
    return label + `<ul class="list">${data.map((v) => `<li class="list-row">${escapeHtml(String(v))}</li>`).join("")}</ul>`;
  }
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (!entries.length) return label + empty("Empty object.");
    return label + `<div class="kv-grid">${entries
      .map(([k, v]) => `<div class="kv"><span class="kv-key">${escapeHtml(k.replace(/_/g, " "))}</span><span class="kv-value">${formatCell(v)}</span></div>`)
      .join("")}</div>`;
  }
  return label + `<div class="kv-grid"><div class="kv"><span class="kv-value">${escapeHtml(String(data))}</span></div></div>`;
}

function formatCell(value) {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return escapeHtml(value.length ? `${value.length} item(s)` : "none");
  if (typeof value === "object") return escapeHtml(JSON.stringify(value));
  if (typeof value === "boolean") return value ? "yes" : "no";
  return escapeHtml(String(value));
}
