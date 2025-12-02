// js/common.js

// OLD:
// const API_BASE = "http://localhost:4000";

// NEW (Production):
const API_BASE = "https://shared-table-api.onrender.com";

// --- AUTH HELPERS ---
function getToken() { return localStorage.getItem("tst_token") || null; }

function getCurrentUser() {
  const raw = localStorage.getItem("tst_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function setAuth(token, user) {
  if (token) localStorage.setItem("tst_token", token);
  if (user) localStorage.setItem("tst_user", JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem("tst_token");
  localStorage.removeItem("tst_user");
}

function logout() { 
    clearAuth(); 
    window.location.href = "index.html"; 
}

// --- NAVBAR LOGIC ---
function updateNavAuth() {
  const container = document.getElementById("nav-auth");
  if (!container) return;
  const user = getCurrentUser();

  if (user) {
    // Show Admin Link if role is Admin
    const adminLink = user.role === 'Admin' 
        ? `<a href="admin.html" class="block px-5 py-3 text-sm text-red-600 font-bold hover:bg-red-50 transition">⚡ Super Admin Panel</a>` 
        : '';

    container.innerHTML = `
      <div class="relative group h-full flex items-center">
        <button class="flex items-center gap-2 text-sm font-bold tracking-wide hover:text-orange-600 transition focus:outline-none py-2" style="color: inherit;">
          <span>${user.name}</span>
          <svg class="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <div class="absolute right-0 top-full pt-4 w-56 hidden group-hover:block z-50">
           <div class="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform origin-top-right transition-all">
              <div class="py-2">
                  ${adminLink}
                  <a href="profile.html" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">Profile</a>
                  <a href="my-bookings.html?view=trips" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">My Booking</a>
                  <a href="my-bookings.html?view=saved" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">My Saved</a>
                  <a href="my-bookings.html?view=hosting" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">My Hosting Experience</a>
                  <div class="border-t border-gray-100 my-1"></div>
                  <button onclick="logout()" class="block w-full text-left px-5 py-3 text-sm text-red-500 hover:bg-red-50 font-bold transition">Log Out</button>
              </div>
           </div>
        </div>
      </div>`;
  } else {
    // Logged Out
    const here = window.location.pathname + window.location.search + window.location.hash;
    const redirectParam = encodeURIComponent(here);
    container.innerHTML = `
      <a href="login.html?redirect=${redirectParam}" class="px-5 py-2.5 bg-orange-600 text-white rounded-full text-sm font-bold shadow-md hover:bg-orange-700 transition transform hover:scale-105">
        Log In / Sign Up
      </a>`;
  }
}

// --- FOOTER INJECTION ---
function injectFooter() {
    if (document.getElementById("app-footer")) return;

    const footer = document.createElement("footer");
    footer.id = "app-footer";
    footer.className = "bg-gray-900 text-gray-400 py-12 border-t border-gray-800 mt-auto"; 
    
    footer.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8 mb-8">
         <div class="col-span-1 md:col-span-1">
            <div class="flex items-center gap-2 mb-4 text-white">
                <div class="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center font-bold text-sm">Q</div>
                <span class="font-bold text-lg">Shared Table</span>
            </div>
            <p class="text-xs leading-relaxed">Connecting people through authentic food, culture, and stories. Built for Australia.</p>
         </div>
         <div>
            <h4 class="text-white font-bold mb-4">Discover</h4>
            <ul class="space-y-2 text-sm">
                <li><a href="explore.html" class="hover:text-orange-500 transition">Search Experiences</a></li>
                <li><a href="explore.html?sort=rating_desc" class="hover:text-orange-500 transition">Top Rated</a></li>
                <li><a href="explore.html?sort=discount_desc" class="hover:text-orange-500 transition">Deals & Offers</a></li>
            </ul>
         </div>
         <div>
            <h4 class="text-white font-bold mb-4">Hosting</h4>
            <ul class="space-y-2 text-sm">
                <li><a href="host.html" class="hover:text-orange-500 transition">List an Experience</a></li>
                <li><a href="my-bookings.html?view=hosting" class="hover:text-orange-500 transition">Host Dashboard</a></li>
                <li><a href="terms.html?section=host" class="hover:text-orange-500 transition">Host Responsibilities</a></li>
            </ul>
         </div>
         <div>
            <h4 class="text-white font-bold mb-4">Support</h4>
            <ul class="space-y-2 text-sm">
                <li><a href="terms.html?section=terms" class="hover:text-orange-500 transition">Terms of Service</a></li>
                <li><a href="terms.html?section=privacy" class="hover:text-orange-500 transition">Privacy Policy</a></li>
                <li><a href="#" class="hover:text-orange-500 transition">Help Center</a></li>
            </ul>
         </div>
      </div>
      <div class="max-w-7xl mx-auto px-4 pt-8 border-t border-gray-800 text-xs text-center flex flex-col md:flex-row justify-between items-center gap-4">
         <p>&copy; 2025 The Shared Table Story. All rights reserved.</p>
         <div class="flex gap-4"><span>Made with ❤️ in Australia</span></div>
      </div>`;
    document.body.appendChild(footer);
}

document.addEventListener("DOMContentLoaded", () => {
    updateNavAuth();
    injectFooter();
});