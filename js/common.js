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

  // 1. INJECT "DEALS" LINK (Desktop)
  const navLinks = document.querySelector('.hidden.md\\:flex');
  if(navLinks && !document.getElementById('nav-deals-link')) {
      const dealsHtml = `<a id="nav-deals-link" href="explore.html?sort=discount_desc" class="text-red-600 font-bold hover:opacity-80 transition duration-300">🔥 Deals</a>`;
      navLinks.insertAdjacentHTML('afterbegin', dealsHtml);
  }

  if (user) {
    const adminLink = user.role === 'Admin' ? `<a href="admin.html" class="block px-5 py-3 text-sm text-red-600 font-bold hover:bg-red-50 transition">⚡ Super Admin Panel</a>` : '';
    const bellIcon = `<div class="relative cursor-pointer group">
        <span class="text-xl">🔔</span>
        <span id="notif-dot" class="absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-white hidden"></span>
        <div class="absolute right-0 top-full pt-4 w-64 hidden group-hover:block z-50">
            <div class="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden p-4 text-sm text-gray-600">
                <p class="font-bold border-b pb-2 mb-2">Notifications</p>
                <div id="notif-list" class="space-y-2 text-xs">No new notifications</div>
            </div>
        </div>
    </div>`;

    if (container) {
        container.innerHTML = `
          <div class="flex items-center gap-6">
            ${bellIcon}
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
            </div>
          </div>`;
          fetchNotifications();
    }

    if (mobileContainer) {
        mobileContainer.innerHTML = `
            <div class="border-t border-gray-100 pt-4 mt-4">
                <div class="flex items-center gap-3 mb-4">
                    <div class="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">${user.name.charAt(0)}</div>
                    <div><div class="font-bold text-gray-900">${user.name}</div><div class="text-xs text-gray-500">${user.email}</div></div>
                </div>
                <a href="explore.html" class="block py-3 text-gray-600 font-medium border-b border-gray-50">Explore Experiences</a>
                <a href="explore.html?sort=discount_desc" class="block py-3 text-red-600 font-bold border-b border-gray-50">🔥 Deals & Offers</a>
                <a href="profile.html" class="block py-3 text-gray-600 font-medium border-b border-gray-50">Profile</a>
                <a href="my-bookings.html?view=trips" class="block py-3 text-gray-600 font-medium border-b border-gray-50">My Bookings</a>
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
    
    // UPDATED: Added standard links here
    if (mobileContainer) mobileContainer.innerHTML = `
        <a href="explore.html" class="block py-3 text-gray-900 font-medium border-b border-gray-50">Explore Experiences</a>
        <a href="host.html" class="block py-3 text-gray-900 font-medium border-b border-gray-50">Host an Experience</a>
        <a href="explore.html?sort=discount_desc" class="block py-3 text-red-600 font-bold border-b border-gray-50">🔥 Deals & Offers</a>
        <div class="mt-6 border-t border-gray-100 pt-6">${loginBtn}</div>`;
  }
}

async function fetchNotifications() {
    const token = getToken();
    if (!token) return;
    try {
        const res = await fetch(`${API_BASE}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
        if(res.ok) {
            const data = await res.json();
            const list = document.getElementById('notif-list');
            const dot = document.getElementById('notif-dot');
            if(data.length > 0) {
                dot.classList.remove('hidden');
                list.innerHTML = data.map(n => `<div class="p-2 bg-gray-50 rounded border border-gray-100 mb-1">${n.message}</div>`).join('');
            }
        }
    } catch(e) {}
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; 
    } else {
        menu.classList.add('hidden');
        document.body.style.overflow = ''; 
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
            <p class="text-xs leading-relaxed text-gray-500">
               Born from the idea that food tastes better when people connect. Every experience on this platform is a doorway into someone’s culture, memory, or home.
            </p>
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
                <li><a href="terms.html?section=host" class="hover:text-orange-500 transition">Trust & Safety</a></li>
                <li><a href="terms.html?section=host" class="hover:text-orange-500 transition">Host Guidelines</a></li>
            </ul>
         </div>

         <div>
            <h4 class="text-white font-bold mb-4">Support</h4>
            <ul class="space-y-2 text-sm">
                <li><a href="about.html" class="hover:text-orange-500 transition">Our Story</a></li>
                <li><a href="terms.html?section=terms" class="hover:text-orange-500 transition">Terms & Cancellation</a></li>
                <li><a href="terms.html?section=privacy" class="hover:text-orange-500 transition">Privacy Policy</a></li>
                <li><a href="about.html" class="hover:text-orange-500 transition">Contact Us</a></li>
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

function checkCookieConsent() {
    if (localStorage.getItem("cookie_consent")) return;
    const banner = document.createElement("div");
    banner.className = "fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-[200] flex flex-col md:flex-row justify-between items-center gap-4 shadow-2xl border-t border-gray-700";
    banner.innerHTML = `
        <div class="text-sm">
            <span class="font-bold">🍪 We use cookies</span> to manage your login and bookings. 
            By using The Shared Table Story, you agree to our <a href="terms.html?section=privacy" class="underline text-orange-400">Privacy Policy</a>.
        </div>
        <button id="accept-cookies" class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition text-sm whitespace-nowrap">
            Accept & Continue
        </button>
    `;
    document.body.appendChild(banner);
    document.getElementById("accept-cookies").addEventListener("click", () => {
        localStorage.setItem("cookie_consent", "true");
        banner.remove();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateNavAuth();
    injectFooter();
    checkCookieConsent();
});