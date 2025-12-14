
/* ================================
   AUTH + API BASE (AUTO-ADDED)
   ================================ */
(function () {
  // Allow override via localStorage if needed:
  // localStorage.setItem("API_BASE", "http://localhost:4000");
  const stored = localStorage.getItem("API_BASE");
  const isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1");

  window.API_BASE = stored || (isLocal ? "http://localhost:4000" : "https://shared-table-api.onrender.com");

  window.setAuth = function (token, user) {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user || {}));
    } catch (e) {}
  };

  window.getAuthToken = function () {
    try { return localStorage.getItem("token"); } catch (e) { return null; }
  };

  window.getAuthUser = function () {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch (e) { return {}; }
  };

  window.authFetch = async function (path, opts) {
    const token = window.getAuthToken();
    const headers = Object.assign({}, (opts && opts.headers) || {});
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!headers["Content-Type"] && opts && opts.method && opts.method !== "GET") {
      headers["Content-Type"] = "application/json";
    }
    const url = path.startsWith("http") ? path : `${window.API_BASE}${path}`;
    return fetch(url, Object.assign({}, opts || {}, { headers }));
  };
})();

// Frontend/js/common.js

// 🔴 THE CRITICAL FIX: The correct URL from your logs
const API_URL = 'https://shared-table-api.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    injectNavbar();
    injectFooter();
    checkAuthStatus();
    initializeMobileMenu();
});

// 1. THE "ONE TRUTH" NAVBAR
function injectNavbar() {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (!navbarPlaceholder) return;

    navbarPlaceholder.innerHTML = `
        <header class="bg-white shadow-sm sticky top-0 z-50">
            <div class="container mx-auto px-4 py-4 flex justify-between items-center">
                <a href="index.html" class="text-2xl font-bold text-orange-600 flex items-center gap-2 font-serif">
                    <i class="fas fa-utensils"></i> The Shared Table Story
                </a>
                <nav class="hidden md:flex items-center space-x-8">
                    <a href="index.html" class="text-gray-600 hover:text-orange-600 font-medium transition">Home</a>
                    <a href="explore.html" class="text-gray-600 hover:text-orange-600 font-medium transition">Explore</a>
                    <a href="explore.html?filter=deals" class="text-red-600 hover:text-red-700 font-bold transition flex items-center gap-1">
                        <i class="fas fa-fire"></i> Deals
                    </a>
                    <a href="host.html" class="text-gray-600 hover:text-orange-600 font-medium transition">Become a Host</a>
                    <div id="auth-section-desktop">
                        <a href="login.html" class="bg-gray-900 text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition">Login</a>
                    </div>
                </nav>
                <button id="mobile-menu-btn" class="md:hidden text-gray-700 focus:outline-none">
                    <i class="fas fa-bars text-2xl"></i>
                </button>
            </div>
            <div id="mobile-menu" class="hidden md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg">
                <div class="flex flex-col p-4 space-y-4">
                    <a href="index.html" class="text-gray-700 hover:text-orange-600 font-medium">Home</a>
                    <a href="explore.html" class="text-gray-700 hover:text-orange-600 font-medium">Explore</a>
                    <a href="explore.html?filter=deals" class="text-red-600 font-bold flex items-center gap-2"><i class="fas fa-fire"></i> Deals</a>
                    <a href="host.html" class="text-gray-700 hover:text-orange-600 font-medium">Become a Host</a>
                    <div id="auth-section-mobile" class="pt-4 border-t border-gray-100">
                        <a href="login.html" class="block w-full text-center bg-gray-900 text-white px-5 py-3 rounded-lg font-medium">Login / Sign Up</a>
                    </div>
                </div>
            </div>
        </header>
    `;
}

// 2. THE FOOTER
function injectFooter() {
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (!footerPlaceholder) return;
    footerPlaceholder.innerHTML = `
        <footer class="bg-gray-900 text-white py-12 mt-auto">
            <div class="container mx-auto px-4 grid md:grid-cols-4 gap-8">
                <div>
                    <h3 class="text-xl font-bold text-orange-500 mb-4 font-serif">The Shared Table Story</h3>
                    <p class="text-gray-400 text-sm">Reconnect with the world, one meal at a time.</p>
                </div>
                <div>
                    <h4 class="font-bold mb-4">Company</h4>
                    <ul class="space-y-2 text-gray-400 text-sm">
                        <li><a href="about.html" class="hover:text-white transition">About Us</a></li>
                        <li><a href="host.html" class="hover:text-white transition">Become a Host</a></li>
                        <li><a href="mailto:contact@thesharedtablestory.com" class="hover:text-white transition">Contact</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-bold mb-4">Support</h4>
                    <ul class="space-y-2 text-gray-400 text-sm">
                        <li><a href="terms.html" class="hover:text-white transition">Terms of Service</a></li>
                        <li><a href="privacy.html" class="hover:text-white transition">Privacy Policy</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="font-bold mb-4">Join the Table</h4>
                    <div class="flex">
                        <input type="email" placeholder="Email" class="px-3 py-2 rounded-l-lg bg-gray-800 border-none text-white w-full">
                        <button class="bg-orange-600 px-4 py-2 rounded-r-lg hover:bg-orange-700 transition">Go</button>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
                &copy; 2025 The Shared Table Story. All rights reserved.
            </div>
        </footer>
    `;
}

// 3. AUTH STATUS
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        const userHtmlDesktop = `
            <div class="relative group">
                <button class="flex items-center gap-2 focus:outline-none">
                    <img src="https://via.placeholder.com/40?text=U" class="w-10 h-10 rounded-full border border-gray-200" id="nav-user-pic">
                </button>
                <div class="hidden group-hover:block absolute right-0 w-48 bg-white shadow-xl rounded-lg border border-gray-100 py-2 mt-2">
                    <a href="my-bookings.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600">Dashboard</a>
                    <a href="profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600">My Profile</a>
                    <button id="logout-btn" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Logout</button>
                </div>
            </div>
        `;
        const userHtmlMobile = `
            <a href="my-bookings.html" class="block text-gray-700 hover:text-orange-600 font-medium py-2">Dashboard</a>
            <a href="profile.html" class="block text-gray-700 hover:text-orange-600 font-medium py-2">My Profile</a>
            <button id="logout-btn-mobile" class="block w-full text-left text-red-600 font-medium py-2">Logout</button>
        `;

        const desktopAuth = document.getElementById('auth-section-desktop');
        if (desktopAuth) desktopAuth.innerHTML = userHtmlDesktop;
        const mobileAuth = document.getElementById('auth-section-mobile');
        if (mobileAuth) mobileAuth.innerHTML = userHtmlMobile;

        attachLogoutListeners();
        loadNavProfilePic();
    }
}

// 4. MOBILE MENU
function initializeMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });
    }
}

// 5. LOGOUT
function attachLogoutListeners() {
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    };
    const desktopBtn = document.getElementById('logout-btn');
    const mobileBtn = document.getElementById('logout-btn-mobile');
    if (desktopBtn) desktopBtn.addEventListener('click', handleLogout);
    if (mobileBtn) mobileBtn.addEventListener('click', handleLogout);
}

// 6. PROFILE PIC
async function loadNavProfilePic() {
    const token = localStorage.getItem('token');
    const img = document.getElementById('nav-user-pic');
    if (!token || !img) return;
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            if (user.profilePic) img.src = user.profilePic;
        }
    } catch (e) {}
}