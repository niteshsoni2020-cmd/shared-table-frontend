// js/login.js


// --- Modal fallback (prevents login breaking if modal component isn't loaded) ---
window.showModal = window.showModal || function (title, message, type) {
  alert(String(title || "") + "\n\n" + String(message || ""));
};

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
        const target = safeRedirectTarget(rawTarget);
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
    const termsAgreed = document.getElementById("signup-terms").checked;

    if (!termsAgreed) {
        showModal("Terms Required", "You must agree to the Terms of Service to create an account.", "error");
        return;
    }

    try {
        const res = await window.authFetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, termsAgreed: true })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            showModal("Signup Failed", (data && data.message) || "Please try again.", "error");
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
    const params = new URLSearchParams(window.location.search);
    if(params.get("mode") === "signup") {
        toggleAuth('signup');
    }
});