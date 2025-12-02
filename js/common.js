// js/common.js

// ✅ PRODUCTION API URL
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

// --- GLOBAL MODAL (Replaces 'alert') ---
function showModal(title, message, type = 'info') {
    let modal = document.getElementById('global-modal');
    
    // Inject modal HTML if it doesn't exist yet
    if (!modal) {
        const html = `
          <div id="global-modal" class="fixed inset-0 bg-black/50 z-[100] hidden flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
            <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all scale-100">
               <div id="modal-icon" class="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">ℹ️</div>
               <h3 id="modal-title" class="text-xl font-bold text-gray-900 mb-2"></h3>
               <p id="modal-message" class="text-gray-600 text-sm mb-6 leading-relaxed"></p>
               <button onclick="document.getElementById('global-modal').classList.add('hidden')" class="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition">Got it</button>
            </div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('global-modal');
    }

    // Populate Content
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    const icon = document.getElementById('modal-icon');
    if(type === 'success') { 
        icon.textContent = '✅'; 
        icon.className = 'h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl'; 
    } else if(type === 'error') { 
        icon.textContent = '⚠️'; 
        icon.className = 'h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl'; 
    } else { 
        icon.textContent = 'ℹ️'; 
        icon.className = 'h-16 w-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl'; 
    }

    modal.classList.remove('hidden');
}

// --- NAVBAR LOGIC ---
function updateNavAuth() {
  const container = document.getElementById("nav-auth");
  const mobileContainer = document.getElementById("mobile-auth");
  
  const user = getCurrentUser();

  if (user) {
    // Admin Link Check
    const adminLink = user.role === 'Admin' ? `<a href="admin.html" class="block px-5 py-3 text-sm text-red-600 font-bold hover:bg-red-50 transition">⚡ Super Admin Panel</a>` : '';

    // 1. DESKTOP DROPDOWN
    if (container) {
        container.innerHTML = `
          <div class="relative group h-full flex items-center">
            <button class="flex items-center gap-2 text-sm font-bold tracking-wide hover:text-orange-600 transition focus:outline-none py-2" style="color: inherit;">
              <span>${user.name}</span>
              <svg class="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            
            <div class="absolute right-0 top-full pt-4 w-64 hidden group-hover:block z-50">
               <div class="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform origin-top-right transition-all">
                  <div class="py-2">
                      ${adminLink}
                      <a href="profile.html" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">Profile</a>
                      <a href="my-bookings.html?view=trips" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">My Bookings</a>
                      <a href="my-bookings.html?view=saved" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">My Saved</a>
                      <a href="my-bookings.html?view=hosting" class="block px-5 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 font-medium transition">Host Dashboard</a>
                      <div class="border-t border-gray-100 my-1"></div>
                      <button onclick="logout()" class="block w-full text-left px-5 py-3 text-sm text-red-500 hover:bg-red-50 font-bold transition">Log Out</button>
                  </div>
               </div>
            </div>
          </div>`;
    }

    // 2. MOBILE MENU LIST
    if (mobileContainer) {
        mobileContainer.innerHTML = `
            <div class="border-t border-gray-100 pt-4 mt-4">
                <div class="flex items-center gap-3 mb-4">
                    <div class="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">${user.name.charAt(0)}</div>
                    <div><div class="font-bold text-gray-900">${user.name}</div><div class="text-xs text-gray-500">${user.email}</div></div>
                </div>
                <a href="profile.html" class="block py-3 text-gray-600 font-medium border-b border-gray-50">Profile</a>
                <a href="my-bookings.html?view=trips" class="block py-3 text-gray-600 font-medium border-b border-gray-50">My Bookings</a>
                <a href="my-bookings.html?view=saved" class="block py-3 text-gray-600 font-medium border-b border-gray-50">My Saved</a>
                <a href="my-bookings.html?view=hosting" class="block py-3 text-gray-600 font-medium border-b border-gray-50">Host Dashboard</a>
                ${user.role === 'Admin' ? '<a href="admin.html" class="block py-3 text-red-600 font-bold border-b border-gray-50">Super Admin Panel</a>' : ''}
                <button onclick="logout()" class="block w-full text-left py-3 text-red-500 font-bold">Log Out</button>
            </div>`;
    }

  } else {
    // LOGGED OUT STATE
    const here = window.location.pathname + window.location.search;
    const redirectParam = encodeURIComponent(here);
    const loginBtn = `<a href="login.html?redirect=${redirectParam}" class="px-5 py-2.5 bg-orange-600 text-white rounded-full text-sm font-bold shadow-md hover:bg-orange-700 transition transform hover:scale-105">Log In</a>`;
    
    if (container) container.innerHTML = loginBtn;
    if (mobileContainer) mobileContainer.innerHTML = `<div class="mt-6 border-t border-gray-100 pt-6">${loginBtn}</div>`;
  }
}

// --- MOBILE MENU TOGGLE ---
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock scroll
    } else {
        menu.classList.add('hidden');
        document.body.style.overflow = ''; // Unlock scroll
    }
}

// --- FOOTER INJECTION ---
function injectFooter() {
    if (document.getElementById("app-footer")) return;

    const footer = document.createElement("footer");
    footer.id = "app-footer";
    footer.className = "bg-gray-900 text-gray-400 py-12 border-t border-gray-800 mt-auto"; 
    
    footer.innerHTML = `
      <div class="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8 mb-8">
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
                <li><a href="mailto:support@thesharedtablestory.com" class="hover:text-orange-500 transition">Contact Support</a></li>
            </ul>
         </div>
      </div>
      
      <div class="max-w-7xl mx-auto px-6 pt-8 border-t border-gray-800 text-xs text-center flex flex-col md:flex-row justify-between items-center gap-4">
         <p>&copy; 2025 The Shared Table Story. All rights reserved.</p>
         <div class="flex gap-4">
            <span>Made with ❤️ in Australia</span>
         </div>
      </div>
    `;

    document.body.appendChild(footer);
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
    updateNavAuth();
    injectFooter();
});