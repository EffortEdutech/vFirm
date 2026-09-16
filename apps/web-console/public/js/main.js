// Boot sequence: fetch identity, render the sidebar for the current mode,
// wire mode-switch + nav clicks, and mount the active page. This is the
// only file that touches the shell chrome (#navScroll, #pageBody, etc.)
// directly -- page modules only ever touch what they're handed as `root`.

import { api, getIdentity, setIdentity } from "./api.js";
import { getSession, signOut } from "./auth.js";
import { PAGE_META, navForMode, defaultPageForMode } from "./nav.js";
import { OWNER_PAGES } from "./pages-owner.js";
import { ADMIN_PAGES } from "./pages-admin.js";
import { initials, escapeHtml } from "./ui.js";

const state = {
  mode: "owner", // "owner" | "admin"
  page: defaultPageForMode("owner"),
};

const els = {
  brandFirmName: document.getElementById("brandFirmName"),
  brandFirmSub: document.getElementById("brandFirmSub"),
  modeOwnerBtn: document.getElementById("modeOwnerBtn"),
  modeAdminBtn: document.getElementById("modeAdminBtn"),
  navScroll: document.getElementById("navScroll"),
  footAvatar: document.getElementById("footAvatar"),
  footName: document.getElementById("footName"),
  footRole: document.getElementById("footRole"),
  footLogout: document.getElementById("footLogout"),
  pageEyebrow: document.getElementById("pageEyebrow"),
  pageTitle: document.getElementById("pageTitle"),
  pageDesc: document.getElementById("pageDesc"),
  pageBody: document.getElementById("pageBody"),
};

function renderNav() {
  const groups = navForMode(state.mode);
  els.navScroll.innerHTML = groups
    .map(
      (group) => `
      <div class="nav-group">
        <div class="nav-category">${escapeHtml(group.category)}</div>
        ${group.items
          .map(
            (item) => `
          <button class="nav-item${item.id === state.page ? " active" : ""}" data-page="${escapeHtml(item.id)}" type="button">
            <span class="nav-icon">${item.icon ?? ""}</span>
            <span class="nav-label">${escapeHtml(item.label)}</span>
          </button>`
          )
          .join("")}
      </div>`
    )
    .join("");

  els.modeOwnerBtn.classList.toggle("active", state.mode === "owner");
  els.modeAdminBtn.classList.toggle("active", state.mode === "admin");
}

function renderPageChrome() {
  const meta = PAGE_META[state.page] ?? { eyebrow: "", title: state.page, desc: "" };
  els.pageEyebrow.textContent = meta.eyebrow;
  els.pageTitle.textContent = meta.title;
  els.pageDesc.textContent = meta.desc;
}

async function renderPage() {
  renderPageChrome();
  // Fresh mount container each navigation so a previous page's scoped
  // click listeners (see pages-owner.js mountWorkdesk / pages-admin.js
  // mountAdminEngineering) don't stack up on repeated visits.
  const fresh = document.createElement("div");
  fresh.className = "page-mount";
  els.pageBody.replaceChildren(fresh);

  const registry = state.mode === "admin" ? ADMIN_PAGES : OWNER_PAGES;
  const mount = registry[state.page];
  if (!mount) {
    fresh.innerHTML = `<div class="empty">Unknown page: ${escapeHtml(state.page)}</div>`;
    return;
  }
  try {
    await mount(fresh);
  } catch (err) {
    fresh.innerHTML = `<div class="error-box"><strong>Page failed to load.</strong><br>${escapeHtml(err?.message ?? String(err))}</div>`;
  }
}

function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  state.page = defaultPageForMode(mode);
  renderNav();
  renderPage();
}

function setPage(page) {
  if (state.page === page) return;
  state.page = page;
  renderNav();
  renderPage();
}

// Uses the identity already resolved by primeIdentity() (real firm/tenant/
// actor records straight from GET /mvp/store) rather than re-fetching
// workspace/active-summary or auth/context -- devActorFromHeaders() always
// returns the placeholder display_name "Dev Auth Actor" (confirmed by
// reading it in apps/api/src/server.mjs), so the store's own actor record
// is the more accurate source for the sidebar.
function applyIdentityToChrome() {
  const identity = getIdentity();
  const firmName = identity?.firm?.name ?? "vFirm";
  const tenantName = identity?.tenant?.name;
  const actorName = identity?.actor?.display_name ?? identity?.actor?.name ?? "Console operator";
  const actorRole = identity?.actor?.role ?? identity?.role ?? "—";

  els.brandFirmName.textContent = firmName;
  els.brandFirmSub.textContent = tenantName ?? "Virtual Firm Platform";
  els.footName.textContent = actorName;
  els.footRole.textContent = actorRole;
  els.footAvatar.textContent = initials(actorName);
}

function wireEvents() {
  els.modeOwnerBtn.addEventListener("click", () => setMode("owner"));
  els.modeAdminBtn.addEventListener("click", () => setMode("admin"));
  els.navScroll.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-page]");
    if (btn) setPage(btn.dataset.page);
  });
  els.footLogout?.addEventListener("click", async () => {
    await signOut().catch(() => {});
    window.location.href = "/login.html";
  });
}

function goToLogin() {
  window.location.href = "/login.html";
}

// Real auth: this page requires a verified Supabase session. No session ->
// straight to /login.html, no console UI ever renders. With a session,
// GET /auth/me resolves the actor/tenant/firm the server has already
// verified via JWT -- replacing the old "fetch the whole store and guess
// the active firm" approach, which had no real identity to guess from
// anyway. needs_firm=true means a verified user with no firm yet (should
// only happen if they navigate here directly mid-signup); send them back
// to finish that step rather than rendering a broken console.
async function primeIdentity() {
  const session = await getSession().catch(() => null);
  if (!session) {
    goToLogin();
    return false;
  }
  try {
    const me = await api.getAuthMe();
    if (me.needs_firm) {
      goToLogin();
      return false;
    }
    setIdentity({
      tenant_id: me.actor.tenant_id,
      firm_id: me.actor.firm_id,
      actor_id: me.actor.actor_id,
      role: me.actor.role,
      firm: me.firm,
      tenant: me.tenant,
      actor: me.actor,
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[vfirm] could not resolve the signed-in identity", err);
    goToLogin();
    return false;
  }
}

async function boot() {
  const ready = await primeIdentity();
  if (!ready) return;
  wireEvents();
  renderNav();
  applyIdentityToChrome();
  await renderPage();
}

// `api` is a module-scoped import, not a global, so it isn't reachable from
// the browser devtools console by default. Expose a debug handle so the
// README's "check api.getIdentity() in the console" instruction actually
// works: type `__vfirm.getIdentity()` (not `api.getIdentity()`) after boot.
window.__vfirm = { api, getIdentity };

boot();
