// ADR-090 W2 (F1, 2026-10-01): "+ New request" -- the owner's front door into the firm.
//
// One form, four questions: what do you need (request type), the brief (title, instructions,
// input files), for whom (the firm's own work, or a client project), and who does it (leave it in
// the Inbox, or assign now -- decision D3). Everything is submitted to POST /work-requests; the
// server re-validates the type, scope, files and worker, and assignment always goes through the
// governed path (authority gate, position/skill scope, Class A). Opened from the topbar
// (main.js) and from the Workdesk Inbox (pages-owner.js).

import { api, scopeStoreToCurrentFirm } from "./api.js";
import { escapeHtml } from "./ui.js";

const FILE_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg";
const CLASSIFICATIONS = [
  ["CLIENT_CONFIDENTIAL", "Client confidential"],
  ["FIRM_INTERNAL", "Firm internal"],
  ["FINANCE_RESTRICTED", "Finance — restricted"],
  ["HR_RESTRICTED", "HR — restricted"],
];
const GROUP_LABELS = {
  general_clerk: "General Clerk",
  bookkeeper: "Bookkeeper",
  sales_coordinator: "Sales Coordinator",
  ops_coordinator: "Ops Coordinator",
  hr_administrator: "HR Administrator",
  CFO: "Chief Finance Officer",
};

// Mirrors workerFitsRequestType() in packages/core-domain/src/awia-work-request-types.mjs (the
// server re-checks it on every assignment).
export function workerFitsType(member, role, type) {
  if (!member || !type) return false;
  if (type.position_id && member.position_id) return member.position_id === type.position_id;
  return (role?.role_code ?? null) === type.role_code;
}

export function eligibleWorkers(ctx, type) {
  return ctx.members.filter((m) => m.lifecycle_status === "ACTIVE" && workerFitsType(m, ctx.roles.find((r) => r.staff_code === m.agent_code), type));
}

export async function loadRequestContext() {
  const [types, rawStore] = await Promise.all([api.getRequestTypes(), api.getStore()]);
  const store = scopeStoreToCurrentFirm(rawStore);
  const clients = store.clients ?? [];
  const relationships = store.firm_client_relationships ?? [];
  const projects = (store.projects ?? []).map((p) => {
    const rel = relationships.find((r) => r.id === p.relationship_id);
    const client = clients.find((c) => c.id === rel?.client_id);
    return { id: p.id, name: p.project_name ?? p.name ?? p.id, client_name: client?.name ?? client?.display_name ?? "Client" };
  });
  return { types, members: store.awia_virtual_staff_members ?? [], roles: store.awia_staff_role_assignments ?? [], projects };
}

function typeOptions(ctx) {
  const groups = new Map();
  for (const type of ctx.types) {
    const key = type.position_id ?? type.role_code;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(type);
  }
  return [...groups.entries()].map(([key, types]) => {
    const staffed = types.some((t) => eligibleWorkers(ctx, t).length > 0);
    const label = `${GROUP_LABELS[key] ?? key}${staffed ? "" : " — not hired yet"}`;
    return `<optgroup label="${escapeHtml(label)}">${types.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)}${t.class_a ? " (Class A)" : ""}</option>`).join("")}</optgroup>`;
  }).join("");
}

// ADR-092 W3: per-skill inputs. Runnable request types (the five deterministic skills) declare
// the form fields and named file slots their skill reads (awia-skill-runner.mjs); everything else
// keeps the free-form brief + files. Field names are prefixed so they never clash with the form.
const DEFAULT_CLASSIFICATION = { "FAO-11": "FINANCE_RESTRICTED", "ARO-10": "HR_RESTRICTED" };

export function skillFieldHtml(field, value) {
  const name = `fi__${field.name}`;
  const req = field.required ? " required" : "";
  const label = `${escapeHtml(field.label)}${field.required ? " *" : ""}`;
  const help = field.help ? `<span class="req-hint">${escapeHtml(field.help)}</span>` : "";
  if (field.type === "boolean") return `<label class="radio"><input type="checkbox" name="${name}" ${value === true ? "checked" : ""}> ${escapeHtml(field.label)}</label>`;
  if (field.type === "select") return `<label>${label}<select name="${name}"${req}><option value="">—</option>${field.options.map((o) => `<option value="${escapeHtml(o.value)}" ${value === o.value ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select>${help}</label>`;
  if (field.type === "multiselect") return `<fieldset class="req-multi"><legend>${label}</legend>${field.options.map((o) => `<label class="radio"><input type="checkbox" name="${name}" value="${escapeHtml(o.value)}" ${Array.isArray(value) && value.includes(o.value) ? "checked" : ""}> ${escapeHtml(o.label)}</label>`).join("")}</fieldset>`;
  const type = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
  return `<label>${label}<input type="${type}" name="${name}"${req}${field.min !== undefined ? ` min="${field.min}"` : ""}${field.placeholder ? ` placeholder="${escapeHtml(field.placeholder)}"` : ""} value="${escapeHtml(value ?? "")}">${help}</label>`;
}

// Reads the fi__* controls back into { name: value } (checkbox -> boolean, multiselect -> array).
export function readSkillFields(form, type) {
  const values = {};
  for (const field of type?.input_fields ?? []) {
    const name = `fi__${field.name}`;
    if (field.type === "boolean") values[field.name] = Boolean(form.querySelector(`input[name="${name}"]`)?.checked);
    else if (field.type === "multiselect") values[field.name] = [...form.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
    else {
      const raw = String(form.querySelector(`[name="${name}"]`)?.value ?? "").trim();
      if (raw !== "") values[field.name] = raw;
    }
  }
  return values;
}

function skillInputsHtml(type) {
  if (!type?.runnable) return `<p class="req-note">Your worker cannot produce this automatically yet: when the work is done, you attach the finished file and it still goes through your review.</p>`;
  const fields = type.input_fields.map((field) => skillFieldHtml(field)).join("");
  const slots = type.file_slots.map((slot) => `<label>${escapeHtml(slot.label)}${slot.required ? " *" : ""}<input type="file" name="slot__${escapeHtml(slot.role)}" accept="${escapeHtml(slot.accept ?? FILE_ACCEPT)}"${slot.required ? " required" : ""}>${slot.help ? `<span class="req-hint">${escapeHtml(slot.help)}</span>` : ""}</label>`).join("");
  return `<p class="req-note req-runnable">Your worker runs this automatically (<strong>${escapeHtml(type.run_label)}</strong>) on the inputs below and gives you a draft to review.</p>${fields}${slots}`;
}

function workerOptions(ctx, type) {
  const workers = eligibleWorkers(ctx, type);
  const assign = workers.map((m) => `<option value="${escapeHtml(m.agent_code)}">Assign now to ${escapeHtml(m.display_name ?? m.agent_code)}</option>`).join("");
  return `<option value="">Put it in my Inbox — I'll assign it</option>${assign}`;
}

// ADR-093 W4 (F4): entry points prefill the form -- a worker ("Give work" on My Team) and/or a
// client project ("Request work" on Projects).
export async function openNewRequestDrawer({ onCreated, presetTypeId, presetWorker, presetProjectId } = {}) {
  document.querySelector(".drawer-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "drawer-overlay";
  overlay.innerHTML = `<aside class="drawer" role="dialog" aria-modal="true" aria-label="New request"><div class="drawer-body"><div class="empty">Loading&hellip;</div></div></aside>`;
  document.body.appendChild(overlay);
  const body = overlay.querySelector(".drawer-body");
  const close = () => { overlay.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (event) => { if (event.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });

  let ctx;
  try {
    ctx = await loadRequestContext();
  } catch (err) {
    body.innerHTML = `<div class="error-box"><strong>Could not open the request form.</strong><br>${escapeHtml(err.message)}</div><div class="wd-actions"><button class="btn btn-ghost btn-sm" type="button" data-close>Close</button></div>`;
    body.querySelector("[data-close]").addEventListener("click", close);
    return;
  }
  const presetMember = presetWorker ? ctx.members.find((m) => m.agent_code === presetWorker) : null;
  const fitsPreset = (t) => presetMember && workerFitsType(presetMember, ctx.roles.find((r) => r.staff_code === presetMember.agent_code), t);
  const firstType = ctx.types.find((t) => t.id === presetTypeId)
    ?? ctx.types.find((t) => fitsPreset(t) && t.runnable) ?? ctx.types.find((t) => fitsPreset(t))
    ?? ctx.types.find((t) => eligibleWorkers(ctx, t).length) ?? ctx.types[0];

  body.innerHTML = `
    <div class="drawer-head"><h2>New request</h2><p>Give your firm a piece of work. Nothing reaches a client without your approval.</p></div>
    <form class="drawer-form" id="newRequestForm">
      <fieldset><legend>1 · What do you need?</legend>
        <select name="request_type_id" required>${typeOptions(ctx)}</select>
        <div class="req-type-help" data-type-help></div>
      </fieldset>
      <fieldset><legend>2 · The brief</legend>
        <label>Title<input type="text" name="title" required maxlength="160" placeholder="e.g. Reconcile September bank vs books"></label>
        <label>Instructions<textarea name="instructions" rows="4" placeholder="What should they do, what matters, anything to watch out for"></textarea></label>
        <div class="req-skill" data-skill-inputs></div>
        <label><span data-files-label>Input files</span><input type="file" name="files" multiple accept="${FILE_ACCEPT}"></label>
        <label>File sensitivity<select name="classification">${CLASSIFICATIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</select></label>
        <label>Other reference (optional)<input type="text" name="reference" placeholder="e.g. client email of 28 Sep"></label>
      </fieldset>
      <fieldset><legend>3 · For whom?</legend>
        <label class="radio"><input type="radio" name="scope" value="internal" checked> The firm's own work (internal — never sent to a client)</label>
        <label class="radio"><input type="radio" name="scope" value="client" ${ctx.projects.length ? "" : "disabled"}> A client project${ctx.projects.length ? "" : " (no projects yet)"}</label>
        <select name="project_id" data-project-select hidden>${ctx.projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.client_name)} — ${escapeHtml(p.name)}</option>`).join("")}</select>
        <div class="req-row">
          <label>Priority<select name="priority"><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="LOW">Low</option></select></label>
          <label>Due date<input type="date" name="due_at"></label>
        </div>
      </fieldset>
      <fieldset><legend>4 · Who does it?</legend>
        <select name="assign_to_staff_code" data-worker-select></select>
        <p class="req-note" data-worker-note></p>
      </fieldset>
      <p class="req-error" data-error hidden></p>
      <div class="wd-actions drawer-foot">
        <button class="btn btn-primary" type="submit">Submit request</button>
        <button class="btn btn-ghost" type="button" data-close>Cancel</button>
      </div>
    </form>`;

  const form = body.querySelector("#newRequestForm");
  const typeSelect = form.elements.request_type_id;
  const workerSelect = form.querySelector("[data-worker-select]");
  const projectSelect = form.querySelector("[data-project-select]");
  const errorBox = form.querySelector("[data-error]");
  typeSelect.value = firstType?.id ?? "";

  function syncType() {
    const type = ctx.types.find((t) => t.id === typeSelect.value);
    const workers = eligibleWorkers(ctx, type);
    form.querySelector("[data-type-help]").innerHTML = type
      ? `${escapeHtml(type.description)}<br><span class="req-hint">${escapeHtml(type.input_hint ?? "")}</span>${type.class_a ? `<br><span class="req-classa">Class A — the draft needs your owner approval before review.</span>` : ""}`
      : "";
    workerSelect.innerHTML = workerOptions(ctx, type);
    form.querySelector("[data-skill-inputs]").innerHTML = skillInputsHtml(type);
    form.querySelector("[data-files-label]").textContent = type?.runnable && type.file_slots.length ? "Other files (optional)" : "Input files";
    if (DEFAULT_CLASSIFICATION[type?.skill_id]) form.elements.classification.value = DEFAULT_CLASSIFICATION[type.skill_id];
    form.querySelector("[data-worker-note]").textContent = workers.length
      ? "Leave it in your Inbox to assign later, or hand it over now."
      : "No one who can do this is hired and active yet — it will wait in your Inbox. Hire one in My Team.";
  }
  typeSelect.addEventListener("change", syncType);
  syncType();
  if (presetWorker && [...workerSelect.options].some((o) => o.value === presetWorker)) workerSelect.value = presetWorker;
  if (presetProjectId && ctx.projects.some((p) => p.id === presetProjectId)) {
    const clientRadio = form.querySelector('input[name="scope"][value="client"]');
    clientRadio.checked = true;
    projectSelect.hidden = false;
    projectSelect.value = presetProjectId;
  }
  form.addEventListener("change", (event) => {
    if (event.target.name === "scope") projectSelect.hidden = event.target.value !== "client";
  });
  form.querySelector("[data-close]").addEventListener("click", close);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;
    const fd = new FormData(form);
    const submit = form.querySelector('button[type="submit"]');
    const controls = [...form.querySelectorAll("input, select, textarea, button")];
    controls.forEach((c) => { c.disabled = true; });
    submit.textContent = "Submitting…";
    try {
      const type = ctx.types.find((t) => t.id === typeSelect.value);
      const uploaded = [];
      const fileRoles = {};
      // Named slots first (e.g. bank statement, book entries), then any other files.
      for (const slot of type?.runnable ? type.file_slots : []) {
        const file = form.querySelector(`input[name="slot__${slot.role}"]`)?.files?.[0];
        if (!file) continue;
        const stored = await api.uploadFile(file, { classification: fd.get("classification"), purpose: "WORK_INPUT" });
        uploaded.push(stored);
        fileRoles[stored.id] = slot.role;
      }
      for (const file of [...(form.elements.files.files ?? [])]) uploaded.push(await api.uploadFile(file, { classification: fd.get("classification"), purpose: "WORK_INPUT" }));
      const reference = String(fd.get("reference") ?? "").trim();
      const result = await api.createWorkRequest({
        request_type_id: fd.get("request_type_id"),
        title: String(fd.get("title") ?? "").trim(),
        instructions: String(fd.get("instructions") ?? "").trim() || undefined,
        project_id: fd.get("scope") === "client" ? fd.get("project_id") : undefined,
        priority: fd.get("priority"),
        due_at: fd.get("due_at") || undefined,
        file_ids: uploaded.map((f) => f.id),
        file_roles: fileRoles,
        form_inputs: type?.runnable ? readSkillFields(form, type) : undefined,
        references: reference ? [reference] : [],
        assign_to_staff_code: fd.get("assign_to_staff_code") || undefined,
      });
      close();
      if (result.assignment_error) alert(`Request ${result.work_request.request_number} is in your Inbox, but it could not be assigned: ${result.assignment_error}`);
      onCreated?.(result);
    } catch (err) {
      controls.forEach((c) => { c.disabled = false; });
      submit.textContent = "Submit request";
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  });
  form.elements.title.focus();
}
