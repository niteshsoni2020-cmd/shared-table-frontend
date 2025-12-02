// js/login.js

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
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            // Use our new pretty modal instead of alert
            showModal("Login Failed", data.message || "Please check your email and password.", "error");
            return;
        }

        setAuth(data.token, data.user);
        
        if (data.user.email === "admin@sharedtable.com") {
            window.location.href = "admin.html";
            return;
        }
        
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        window.location.href = redirect ? decodeURIComponent(redirect) : "index.html";

    } catch (err) {
        showModal("Connection Error", "Could not connect to the server. Please check your internet.", "error");
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
        const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, termsAgreed: true })
        });
        const data = await res.json();

        if (!res.ok) {
            showModal("Signup Failed", data.message || "Please try again.", "error");
            return;
        }

        // Success Modal
        showModal("Welcome Aboard! 🌏", "Your profile has been created successfully. We've sent a welcome email to your inbox.", "success");
        
        // Auto Login & Redirect
        setAuth(data.token, data.user);
        setTimeout(() => {
            window.location.href = "profile.html"; // Go to profile to finish details
        }, 2500); // Wait 2.5s so they can read the modal

    } catch (err) {
        showModal("Connection Error", "Could not connect to the server.", "error");
    }
}

// --- 4. INIT ---
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if(params.get("mode") === "signup") {
        toggleAuth('signup');
    }
});