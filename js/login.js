// js/login.js


// --- Modal fallback (prevents login breaking if modal component isn't loaded) ---
window.showModal = window.showModal || function (title, message, type) {
  var t = String(type || "info").toLowerCase();
  var notifyType = (t === "error") ? "error" : (t === "success") ? "success" : "info";
  window.tstsNotify(String(title || "") + ": " + String(message || ""), notifyType);
};

async function handleForgotPassword(e) {
    try { if (e && typeof e.preventDefault === "function") e.preventDefault(); } catch (_) {}

    const emailEl = document.getElementById("login-email");
    const email = String((emailEl && emailEl.value) ? emailEl.value : "").trim();

    if (!email) {
        showModal("Forgot Password", "Enter your email in the Email field first, then click Forgot Password again.", "error");
        return;
    }

    try {
        const res = await window.authFetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await res.json().catch(() => ({}));
        const msg = (data && data.message) ? String(data.message) : "If an account exists, you will receive instructions.";

        // Always show privacy-safe message; backend is intentionally non-enumerating.
        const next = "reset-password.html?email=" + encodeURIComponent(email);
        showModal(
            "Reset Password",
            msg + "\n\nThen open: " + next,
            "success"
        );
    } catch (_) {
        showModal("Reset Password", "Could not reach the server. Please try again.", "error");
    }
}

function safeRedirectTarget(rawTarget) {
  // Allow only same-site relative navigations (no schemes, no protocol-relative)
  let t = String(rawTarget || "index.html").trim();
  try { t = decodeURIComponent(t); } catch (_) {}

  const lower = t.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("//") ||
    lower.startsWith("javascript:")
  ) {
    return "index.html";
  }

  // Must be a simple relative path
  if (t.startsWith("/")) return t.slice(1);
  return t;
}



// --- 1. TOGGLE FORMS ---
function toggleAuth(mode) {
    const loginForm = document.getElementById("form-login");
    const signupForm = document.getElementById("form-signup");
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");

    if (mode === 'login') {
        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
        tabLogin.className = "flex-1 pb-3 font-bold text-orange-600 border-b-2 border-orange-600 transition-colors";
        tabSignup.className = "flex-1 pb-3 font-medium text-gray-500 hover:text-gray-900 transition-colors";
    } else {
        signupForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
        tabSignup.className = "flex-1 pb-3 font-bold text-orange-600 border-b-2 border-orange-600 transition-colors";
        tabLogin.className = "flex-1 pb-3 font-medium text-gray-500 hover:text-gray-900 transition-colors";
    }
}

// --- 2. LOGIN LOGIC ---
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
        const res = await window.authFetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showModal("Login Failed", (data && data.message) || "Please check your email and password.", "error");
            return;
        }

        if (window.setAuth) window.setAuth(data.token, data.user);
        

        if (data.user && data.user.email === "admin@sharedtable.com") {
            window.location.href = "admin.html";
            return;
        }

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        const returnTo = params.get("returnTo");
        const rawTarget = redirect || returnTo || "index.html";
        let target = safeRedirectTarget(rawTarget);
        const allowed = new Set([
            "index.html",
            "admin.html",
            "profile.html",
            "host.html",
            "explore.html",
            "feed.html",
            "connections.html",
            "bookmarks.html",
            "my-bookings.html",
            "experience.html",
            "reset-password.html",
            "login.html"
        ]);
        if (!allowed.has(target)) target = "profile.html";
        window.location.href = target;

    } catch (err) {
        showModal("Connection Error", "Could not connect to the server. Please try again.", "error");
    }


}

// --- 3. SIGNUP LOGIC ---
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;
    const termsAgreed = document.getElementById("signup-terms").checked;

    if (password !== confirmPassword) {
        showModal("Password Mismatch", "Passwords do not match. Please re-enter your password.", "error");
        return;
    }

    if (password.length < 8) {
        showModal("Password Too Short", "Password must be at least 8 characters long.", "error");
        return;
    }

    if (!termsAgreed) {
        showModal("Terms Required", "You must agree to the Terms of Service to create an account.", "error");
        return;
    }

    try {
        const res = await window.authFetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, confirmPassword, termsAgreed: true })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showModal("Sign up failed", (data && data.message) || "Please try again.", "error");
            return;
        }

        showModal("Welcome Aboard! 🌏", "Your profile has been created successfully.", "success");

        if (window.setAuth) window.setAuth(data.token, data.user);
        

        setTimeout(() => {
            window.location.href = "profile.html";
        }, 1200);

    } catch (err) {
        showModal("Connection Error", "Could not connect to the server. Please try again.", "error");
    }


}

// --- 4. INIT ---
document.addEventListener("DOMContentLoaded", () => {
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");
    const loginForm = document.getElementById("form-login");
    const signupForm = document.getElementById("form-signup");
    const forgotBtn = document.getElementById("btn-forgot-password");

    if (tabLogin) tabLogin.addEventListener("click", () => toggleAuth("login"));
    if (tabSignup) tabSignup.addEventListener("click", () => toggleAuth("signup"));
    if (loginForm) loginForm.addEventListener("submit", handleLogin);
    if (signupForm) signupForm.addEventListener("submit", handleSignup);
    if (forgotBtn) forgotBtn.addEventListener("click", handleForgotPassword);

    if (loginForm && signupForm && tabLogin && tabSignup) {
        toggleAuth("login");
    }
});
