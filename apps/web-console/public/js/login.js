// Wiring for login.html. Deliberately separate from main.js's boot flow --
// this page never touches the sidebar/nav chrome or the api.js identity
// cache; it only establishes a Supabase session and, if needed, creates the
// user's firm, then hands off to "/" for main.js to take over.
import { getSession, signIn, signUp } from "./auth.js";
import { api } from "./api.js";

const els = {
  loadingPanel: document.getElementById("loadingPanel"),
  credentialsPanel: document.getElementById("credentialsPanel"),
  checkEmailPanel: document.getElementById("checkEmailPanel"),
  createFirmForm: document.getElementById("createFirmForm"),
  errorBox: document.getElementById("errorBox"),
  tabSignIn: document.getElementById("tabSignIn"),
  tabSignUp: document.getElementById("tabSignUp"),
  signInForm: document.getElementById("signInForm"),
  signUpForm: document.getElementById("signUpForm"),
};

function showOnly(panel) {
  els.loadingPanel.style.display = "none";
  els.credentialsPanel.style.display = "none";
  els.checkEmailPanel.classList.remove("active");
  els.createFirmForm.classList.remove("active");
  if (panel === "credentials") els.credentialsPanel.style.display = "block";
  if (panel === "check-email") els.checkEmailPanel.classList.add("active");
  if (panel === "create-firm") els.createFirmForm.classList.add("active");
}

function showError(message) {
  els.errorBox.textContent = message;
  els.errorBox.style.display = "block";
}

function clearError() {
  els.errorBox.style.display = "none";
  els.errorBox.textContent = "";
}

async function afterSessionEstablished() {
  try {
    const me = await api.getAuthMe();
    if (me.needs_firm) {
      showOnly("create-firm");
    } else {
      window.location.href = "/";
    }
  } catch (err) {
    showOnly("credentials");
    showError(err.message ?? "Could not verify your session.");
  }
}

document.querySelectorAll(".pw-toggle").forEach((btn) => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.toggleFor);
    if (!input) return;
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    btn.textContent = isHidden ? "Hide" : "Show";
  });
});

els.tabSignIn.addEventListener("click", () => {
  els.tabSignIn.classList.add("active");
  els.tabSignUp.classList.remove("active");
  els.signInForm.classList.add("active");
  els.signUpForm.classList.remove("active");
  clearError();
});

els.tabSignUp.addEventListener("click", () => {
  els.tabSignUp.classList.add("active");
  els.tabSignIn.classList.remove("active");
  els.signUpForm.classList.add("active");
  els.signInForm.classList.remove("active");
  clearError();
});

els.signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  const email = document.getElementById("signInEmail").value.trim();
  const password = document.getElementById("signInPassword").value;
  try {
    await signIn(email, password);
    await afterSessionEstablished();
  } catch (err) {
    showError(err.message ?? "Sign in failed.");
  }
});

els.signUpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  const email = document.getElementById("signUpEmail").value.trim();
  const password = document.getElementById("signUpPassword").value;
  try {
    const { session } = await signUp(email, password);
    if (session) {
      // Email confirmation is off for this project -- we already have a
      // usable session, go straight to firm setup.
      await afterSessionEstablished();
    } else {
      // Email confirmation is on -- Supabase sent a confirmation link; the
      // session appears only after the user clicks it and returns here.
      showOnly("check-email");
    }
  } catch (err) {
    showError(err.message ?? "Sign up failed.");
  }
});

els.createFirmForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();
  const firm_name = document.getElementById("firmName").value.trim();
  const principal_name = document.getElementById("principalName").value.trim();
  const submitBtn = els.createFirmForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  try {
    await api.signupFirm({ firm_name, principal_name });
    window.location.href = "/";
  } catch (err) {
    submitBtn.disabled = false;
    showOnly("credentials");
    showError(err.message ?? "Could not create your firm.");
  }
});

(async function boot() {
  try {
    const session = await getSession();
    if (session) {
      await afterSessionEstablished();
    } else {
      showOnly("credentials");
    }
  } catch {
    showOnly("credentials");
  }
})();
