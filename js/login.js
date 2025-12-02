// js/login.js

// --- 1. TOGGLE BETWEEN LOGIN & SIGNUP FORMS ---
function toggleAuth(mode) {
    const loginForm = document.getElementById("form-login");
    const signupForm = document.getElementById("form-signup");
    const tabLogin = document.getElementById("tab-login");
    const tabSignup = document.getElementById("tab-signup");

    if (mode === 'login') {
        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
        tabLogin.className = "flex-1 pb-3 font-bold text-orange-600 border-b-2 border-orange-600 transition-colors";
        tabSignup.className = "flex-1 pb-3 font-medium text-gray-500 hover:text-gray-800 transition-colors";
    } else {
        signupForm.classList.remove("hidden");
        loginForm.classList.add("hidden");
        tabSignup.className = "flex-1 pb-3 font-bold text-orange-600 border-b-2 border-orange-600 transition-colors";
        tabLogin.className = "flex-1 pb-3 font-medium text-gray-500 hover:text-gray-800 transition-colors";
    }
}

// --- 2. HANDLE LOGIN ---
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
            if(confirm("Login failed. " + (data.message || "") + "\n\nDo you need to create an account?")) {
                toggleAuth('signup');
            }
            return;
        }

        // Save Auth
        setAuth(data.token, data.user);
        
        // ADMIN CHECK
        if (data.user.email === "admin@sharedtable.com") {
            window.location.href = "admin.html";
            return;
        }
        
        // Redirect Logic
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        window.location.href = redirect ? decodeURIComponent(redirect) : "index.html";

    } catch (err) {
        console.error(err);
        alert("Network error. Please check your connection.");
    }
}

// --- 3. HANDLE SIGNUP ---
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById("signup-name").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    
    // Validate Single Checkbox
    const termsAgreed = document.getElementById("signup-terms").checked;

    if (!termsAgreed) {
        alert("You must agree to the Terms of Service & Waiver to continue.");
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
            alert(data.message || "Signup failed.");
            return;
        }

        alert("Profile created! Please check your email for verification link.");
        
        // Auto-login & redirect to Profile
        setAuth(data.token, data.user);
        window.location.href = "profile.html"; 

    } catch (err) {
        console.error(err);
        alert("Network error. Please check your connection.");
    }
}

// --- 4. INIT ---
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if(params.get("mode") === "signup") {
        toggleAuth('signup');
    }
});