// tsts-scroll-top-guard (global)
// Purpose: prevent Safari/Back-Forward Cache scroll restoration landing mid-page.
(function(){
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    function reset(e){
      if (location.hash) return;
      if (e && e.persisted) { window.scrollTo(0, 0); return; }
      window.scrollTo(0, 0);
    }

    window.addEventListener("DOMContentLoaded", reset);
    window.addEventListener("pageshow", reset);
  } catch (_) {}
})();

/* ================================
   TSTS COMMON (single truth)
   - API base
   - auth helpers
   - navbar/footer injection
   - DOM XSS-safe helpers
   ================================ */

// WS-FE-05: Helper version marker for reliable validation
window.__TSTS_HELPERS_VERSION__ = "2026.01.19";

// XSS-safe DOM helpers
window.tstsSetText = function(el, value) {
  if (!el) return;
  el.textContent = (value == null) ? "" : String(value);
};

window.tstsEl = function(tag, attrs, children) {
  const el = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(function(key) {
      const v = attrs[key];
      const isDev = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
      function blocked(k) {
        if (isDev) throw new Error("Blocked unsafe attribute: " + k);
        return;
      }

      if (key === "innerHTML" || key === "outerHTML" || key === "srcdoc") {
        blocked(key);
        return;
      }

      if (key === "className") {
        el.className = v;
      } else if (key === "textContent") {
        el.textContent = v;
      } else if (key === "dataset") {
        if (v == null) return;
        if (typeof v !== "object" || Array.isArray(v)) {
          blocked("dataset");
          return;
        }
        Object.keys(v).forEach(function(dk) {
          try {
            if (v[dk] == null) return;
            el.dataset[dk] = String(v[dk]);
          } catch (_) {}
        });
      } else if (key === "style") {
        if (v == null) return;
        if (typeof v !== "object" || Array.isArray(v)) {
          blocked("style");
          return;
        }
        Object.keys(v).forEach(function(sk) {
          try {
            if (v[sk] == null) return;
            el.style[sk] = String(v[sk]);
          } catch (_) {}
        });
      } else if (key.startsWith("on")) {
        if (typeof v === "function") {
          el.addEventListener(key.slice(2).toLowerCase(), v);
        } else if (typeof v === "string") {
          blocked(key);
        }
      } else if (key.startsWith("data-")) {
        el.setAttribute(key, v);
      } else {
        if (typeof v === "function") return;
        try { el[key] = v; } catch (_) {}
      }
    });
  }
  if (children) {
    (Array.isArray(children) ? children : [children]).forEach(function(child) {
      if (child == null) return;
      if (typeof child === "string" || typeof child === "number") {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    });
  }
  return el;
};

window.tstsSafeUrl = function(url, fallback) {
  if (!url || typeof url !== "string") return fallback || "";
  const raw = url.trim();
  const trimmed = raw.toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:") || trimmed.startsWith("vbscript:")) {
    return fallback || "";
  }
  if (trimmed.startsWith("//")) {
    return fallback || "";
  }

  const hasColon = trimmed.indexOf(":") !== -1;
  if (hasColon && !(trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
    return fallback || "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return raw;
  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) return raw;
  if (trimmed.startsWith("#")) return raw;
  return raw;
};

window.tstsSafeImg = function(imgEl, url, fallback) {
  if (!imgEl) return;
  const fb = fallback || "https://via.placeholder.com/400x300?text=No+Image";
  const safeUrl = window.tstsSafeUrl(url, fb);
  imgEl.src = safeUrl || fb;
  imgEl.addEventListener("error", function() { imgEl.src = fb; }, { once: true });
};

// WS-FE-06: Safe mailto helper - prevents href injection
window.tstsSafeMailto = function(email) {
  if (!email || typeof email !== "string") return "";
  var trimmed = email.trim();
  if (!trimmed) return "";
  // Reject if contains dangerous characters: spaces, newlines, control chars, colons, angle brackets
  if (/[\s\n\r\x00-\x1f:<>]/.test(trimmed)) return "";
  // Reject if looks like a protocol
  if (/^[a-z]+:/i.test(trimmed)) return "";
  // Basic email pattern: must have @ and at least one dot after @
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "";
  return "mailto:" + trimmed;
};

// WS-FE-04: Dev guard - throws if helpers are missing (catches load order issues)
(function() {
  var isDev = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
  if (isDev) {
    window.__TSTS_ASSERT_HELPERS__ = function() {
      if (!window.tstsEl) throw new Error("TSTS: common.js not loaded - tstsEl missing");
      if (!window.tstsSafeUrl) throw new Error("TSTS: common.js not loaded - tstsSafeUrl missing");
      if (!window.tstsSafeImg) throw new Error("TSTS: common.js not loaded - tstsSafeImg missing");
    };
  }
})();

(function () {
  (function ensureFontAwesome() {
    try {
      const id = "tsts-fontawesome";
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
      link.referrerPolicy = "no-referrer";
      document.head.appendChild(link);
    } catch (_) {}
  })();

  const isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1");

  // Optional override for QA:
  // localStorage.setItem("API_BASE", "http://localhost:4000");
  const storedBase = (() => {
    try { return localStorage.getItem("API_BASE") || ""; } catch (_) { return ""; }
  })();

  const DEFAULT_PROD_API_ORIGIN = "https://shared-table-api.onrender.com";
  const apiOrigin = storedBase || (isLocal ? "http://localhost:4000" : DEFAULT_PROD_API_ORIGIN);
  window.API_BASE = apiOrigin;
// Cloudinary config (single-truth; used by profile.js)
  window.CLOUDINARY_URL = window.CLOUDINARY_URL || "https://api.cloudinary.com/v1_1/dkqf90k20/image/upload";
  window.CLOUDINARY_PRESET = window.CLOUDINARY_PRESET || "unsigned_preset";


  window.setAuth = function (token, user) {
    try {
      // token: set when truthy, otherwise clear
      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");

      // user: set when provided (non-null), otherwise clear
      if (user != null) localStorage.setItem("user", JSON.stringify(user));
      else localStorage.removeItem("user");
    } catch (_) {}
  };

  window.getAuthToken = function () {
    try { return localStorage.getItem("token") || ""; } catch (_) { return ""; }
  };

  window.clearAuth = function () {
    try { localStorage.removeItem("token"); localStorage.removeItem("user"); } catch (_) {}
  };

  window.getAuthUser = function () {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch (_) { return {}; }
  };

  function normalizePath(path) {
    if (!path) return "/";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (!path.startsWith("/")) return "/" + path;
    return path;
  }
  window.authFetch = async function (path, opts) {
    const token = window.getAuthToken();
    const headers = Object.assign({}, (opts && opts.headers) || {});
    const method = (opts && opts.method) ? String(opts.method).toUpperCase() : "GET";

    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!headers["Content-Type"] && method !== "GET") headers["Content-Type"] = "application/json";

    // Single rule:
    // - Accept "/api/..." or "api/..." or "/..." and always route to API_BASE
    const raw = String(path || "");

    // If caller passes a full URL, do not rewrite it.
    if (/^https?:\/\//i.test(raw)) {
      return fetch(raw, Object.assign({}, opts || {}, { headers }));
    }

    const normalized = raw.startsWith("/") ? raw : ("/" + raw);
    const apiPath = normalized.startsWith("/api/") ? normalized : ("/api" + normalized);

    const base = String(window.API_BASE || "").replace(/\/$/, "");
    const url = base + apiPath;

    return fetch(url, Object.assign({}, opts || {}, { headers }));
  };

  function tstsParseDateLike(x) {
    try {
      if (!x) return null;
      if (x instanceof Date) return isNaN(x.getTime()) ? null : x;
      const s = String(x).trim();
      if (!s) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + "T00:00:00");
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    } catch (_) {
      return null;
    }
  }

  window.tstsFormatDateShort = function (x) {
    const d = tstsParseDateLike(x);
    if (!d) return "";
    try {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
      return d.toDateString();
    }
  };

  window.tstsFormatDateWeekday = function (x) {
    const d = tstsParseDateLike(x);
    if (!d) return "";
    try {
      return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    } catch (_) {
      return d.toDateString();
    }
  };
})();

// DOM bootstrap
document.addEventListener("DOMContentLoaded", () => {
  injectNavbar();
  injectFooter();
  applyAuthStateToNav();
  initMobileMenu();
});

// 1) NAVBAR (single truth) - DOM-safe construction
function injectNavbar() {
  const root = document.getElementById("navbar-placeholder");
  if (!root) return;

  const logoIcon = tstsEl("span", { className: "inline-flex items-center justify-center h-9 w-9 rounded-full bg-orange-50 border border-orange-100" }, [
    tstsEl("i", { className: "fas fa-utensils text-orange-600" })
  ]);
  const logoText = tstsEl("span", {}, "The Shared Table Story");
  const logo = tstsEl("a", { href: "index.html", className: "text-2xl font-bold text-orange-600 flex items-center gap-2 font-serif" }, [logoIcon, logoText]);
  logo.setAttribute("aria-label", "The Shared Table Story");

  const navHome = tstsEl("a", { href: "index.html", className: "text-gray-600 hover:text-orange-600 font-medium transition" }, "Home");
  const navExplore = tstsEl("a", { href: "explore.html", className: "text-gray-600 hover:text-orange-600 font-medium transition" }, "Explore");
  const dealsIcon = tstsEl("i", { className: "fas fa-fire" });
  const navDeals = tstsEl("a", { href: "explore.html?filter=deals", className: "text-red-600 hover:text-red-700 font-bold transition flex items-center gap-1" }, [dealsIcon, " Deals"]);
  const navHost = tstsEl("a", { href: "host.html", className: "text-gray-600 hover:text-orange-600 font-medium transition" }, "Become a Host");
  const authDesktop = tstsEl("div", { id: "auth-section-desktop" }, [
    tstsEl("a", { href: "login.html", className: "bg-gray-900 text-white px-5 py-2 rounded-full font-medium hover:bg-gray-800 transition" }, "Login")
  ]);
  const nav = tstsEl("nav", { className: "hidden md:flex items-center space-x-8" }, [navHome, navExplore, navDeals, navHost, authDesktop]);

  const menuBtn = tstsEl("button", { id: "mobile-menu-btn", className: "md:hidden text-gray-700 focus:outline-none" }, [
    tstsEl("i", { className: "fas fa-bars text-2xl" })
  ]);
  menuBtn.setAttribute("aria-label", "Open menu");

  const container = tstsEl("div", { className: "container mx-auto px-4 py-4 flex justify-between items-center" }, [logo, nav, menuBtn]);

  const mobileHome = tstsEl("a", { href: "index.html", className: "text-gray-700 hover:text-orange-600 font-medium" }, "Home");
  const mobileExplore = tstsEl("a", { href: "explore.html", className: "text-gray-700 hover:text-orange-600 font-medium" }, "Explore");
  const mobileDealsIcon = tstsEl("i", { className: "fas fa-fire" });
  const mobileDeals = tstsEl("a", { href: "explore.html?filter=deals", className: "text-red-600 font-bold flex items-center gap-2" }, [mobileDealsIcon, " Deals"]);
  const mobileHost = tstsEl("a", { href: "host.html", className: "text-gray-700 hover:text-orange-600 font-medium" }, "Become a Host");
  const authMobile = tstsEl("div", { id: "auth-section-mobile", className: "pt-4 border-t border-gray-100" }, [
    tstsEl("a", { href: "login.html", className: "block w-full text-center bg-gray-900 text-white px-5 py-3 rounded-lg font-medium" }, "Login / Sign Up")
  ]);
  const mobileMenuInner = tstsEl("div", { className: "flex flex-col p-4 space-y-4" }, [mobileHome, mobileExplore, mobileDeals, mobileHost, authMobile]);
  const mobileMenu = tstsEl("div", { id: "mobile-menu", className: "hidden md:hidden bg-white border-t border-gray-100 absolute w-full left-0 shadow-lg" }, [mobileMenuInner]);

  const header = tstsEl("header", { className: "bg-white shadow-sm sticky top-0 z-50" }, [container, mobileMenu]);
  root.appendChild(header);
}

// 2) FOOTER - DOM-safe construction
function injectFooter() {
  const root = document.getElementById("footer-placeholder");
  if (!root) return;

  const col1 = tstsEl("div", {}, [
    tstsEl("h3", { className: "text-xl font-bold text-orange-500 mb-4 font-serif" }, "The Shared Table Story"),
    tstsEl("p", { className: "text-gray-400 text-sm" }, "Reconnect with the world, one meal at a time.")
  ]);

  const col2 = tstsEl("div", {}, [
    tstsEl("h4", { className: "font-bold mb-4" }, "Company"),
    tstsEl("ul", { className: "space-y-2 text-gray-400 text-sm" }, [
      tstsEl("li", {}, [tstsEl("a", { href: "about.html", className: "hover:text-white transition" }, "About Us")]),
      tstsEl("li", {}, [tstsEl("a", { href: "host.html", className: "hover:text-white transition" }, "Become a Host")]),
      tstsEl("li", {}, [tstsEl("a", { href: "mailto:contact@thesharedtablestory.com", className: "hover:text-white transition" }, "Contact")])
    ])
  ]);

  const col3 = tstsEl("div", {}, [
    tstsEl("h4", { className: "font-bold mb-4" }, "Support"),
    tstsEl("ul", { className: "space-y-2 text-gray-400 text-sm" }, [
      tstsEl("li", {}, [tstsEl("a", { href: "terms.html", className: "hover:text-white transition" }, "Terms of Service")]),
      tstsEl("li", {}, [tstsEl("a", { href: "privacy.html", className: "hover:text-white transition" }, "Privacy Policy")])
    ])
  ]);

  const emailInput = tstsEl("input", { type: "email", placeholder: "Email", className: "px-3 py-2 rounded-l-lg bg-gray-800 border-none text-white w-full" });
  const goBtn = tstsEl("button", { className: "bg-orange-600 px-4 py-2 rounded-r-lg hover:bg-orange-700 transition" }, "Go");
  const col4 = tstsEl("div", {}, [
    tstsEl("h4", { className: "font-bold mb-4" }, "Join the Table"),
    tstsEl("div", { className: "flex" }, [emailInput, goBtn])
  ]);

  const grid = tstsEl("div", { className: "container mx-auto px-4 grid md:grid-cols-4 gap-8" }, [col1, col2, col3, col4]);
  const copyright = tstsEl("div", { className: "border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm" }, "© 2026 The Shared Table Story. All rights reserved.");
  const footer = tstsEl("footer", { className: "bg-gray-900 text-white py-12 mt-auto" }, [grid, copyright]);
  root.appendChild(footer);
}

// 3) AUTH STATE IN NAV - DOM-safe construction
function applyAuthStateToNav() {
  const token = (window.getAuthToken && window.getAuthToken()) || "";
  if (!token) return;

  // Desktop auth menu
  const desktopAuth = document.getElementById("auth-section-desktop");
  if (desktopAuth) {
    desktopAuth.textContent = "";
    const userPic = tstsEl("img", { id: "nav-user-pic", src: "https://via.placeholder.com/40?text=U", className: "w-10 h-10 rounded-full border border-gray-200" });
    const menuBtn = tstsEl("button", { className: "flex items-center gap-2 focus:outline-none" }, [userPic]);
    menuBtn.setAttribute("aria-label", "Account menu");

    const menuLinks = [
      { href: "my-bookings.html", text: "Dashboard" },
      { href: "bookmarks.html", text: "My Bookmarks" },
      { href: "connections.html", text: "Connections" },
      { href: "feed.html", text: "Friends Feed" },
      { href: "profile.html", text: "My Profile" },
      { href: "policy.html", text: "Policy" },
      { href: "report.html", text: "Report" }
    ];
    const dropdownItems = menuLinks.map(function(lnk) {
      return tstsEl("a", { href: lnk.href, className: "block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600" }, lnk.text);
    });
    const logoutBtn = tstsEl("button", { id: "logout-btn", className: "block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50" }, "Logout");
    dropdownItems.push(logoutBtn);
    const dropdown = tstsEl("div", { className: "hidden group-hover:block absolute right-0 w-48 bg-white shadow-xl rounded-lg border border-gray-100 py-2 mt-2" }, dropdownItems);
    const wrapper = tstsEl("div", { className: "relative group" }, [menuBtn, dropdown]);
    desktopAuth.appendChild(wrapper);
  }

  // Mobile auth menu
  const mobileAuth = document.getElementById("auth-section-mobile");
  if (mobileAuth) {
    mobileAuth.textContent = "";
    const mobileLinks = [
      { href: "my-bookings.html", text: "Dashboard" },
      { href: "bookmarks.html", text: "My Bookmarks" },
      { href: "connections.html", text: "Connections" },
      { href: "feed.html", text: "Friends Feed" },
      { href: "profile.html", text: "My Profile" },
      { href: "policy.html", text: "Policy" },
      { href: "report.html", text: "Report" }
    ];
    mobileLinks.forEach(function(lnk) {
      mobileAuth.appendChild(tstsEl("a", { href: lnk.href, className: "block text-gray-700 hover:text-orange-600 font-medium py-2" }, lnk.text));
    });
    mobileAuth.appendChild(tstsEl("button", { id: "logout-btn-mobile", className: "block w-full text-left text-red-600 font-medium py-2" }, "Logout"));
  }

  attachLogoutListeners();
  loadNavProfilePic();
}

// 4) MOBILE MENU
function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (!btn || !menu) return;
  btn.addEventListener("click", () => menu.classList.toggle("hidden"));
}

// 5) LOGOUT
function attachLogoutListeners() {
  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (_) {}
    location.href = "index.html";
  };

  const desktopBtn = document.getElementById("logout-btn");
  const mobileBtn = document.getElementById("logout-btn-mobile");
  if (desktopBtn) desktopBtn.addEventListener("click", handleLogout);
  if (mobileBtn) mobileBtn.addEventListener("click", handleLogout);
}

// 6) NAV PROFILE PIC
async function loadNavProfilePic() {
  try {
    if (String(location.pathname || "").endsWith("/profile.html") || String(location.pathname || "").endsWith("profile.html")) return;
  } catch (_) {}

  const token = (window.getAuthToken && window.getAuthToken()) || "";
  const img = document.getElementById("nav-user-pic");
  if (!token || !img) return;

  try {
    const cached = (window.getAuthUser && window.getAuthUser()) || {};
    if (cached && cached.profilePic) { window.tstsSafeImg(img, cached.profilePic, "https://via.placeholder.com/40?text=U"); return; }

    const res = await window.authFetch("/api/auth/me", { method: "GET" });

    if (res.status === 401 || res.status === 403) {
      if (window.clearAuth) window.clearAuth();
      const returnTo = encodeURIComponent(location.pathname + location.search);
      location.href = "login.html?returnTo=" + returnTo;
      return;
    }

    if (!res.ok) return;
    const payload = await res.json();
    const u = (payload && payload.user) ? payload.user : payload;
    if (u && u.profilePic) window.tstsSafeImg(img, u.profilePic, "https://via.placeholder.com/40?text=U");
  } catch (_) {}
}
