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
  const fb = fallback || "/assets/experience-default.jpg";
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

// WS-FE-07: Branded toast notification (replaces alert())
(function() {
  var toastContainer = null;

  function ensureContainer() {
    if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
    toastContainer = window.tstsEl("div", {
      id: "tsts-toast-container",
      className: "fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
    });
    document.body.appendChild(toastContainer);
    return toastContainer;
  }

  window.tstsNotify = function(msg, type) {
    var t = String(type || "info").toLowerCase();
    var colors = {
      success: "bg-green-600 text-white",
      error: "bg-red-600 text-white",
      warning: "bg-amber-500 text-white",
      info: "bg-gray-800 text-white"
    };
    var icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle"
    };
    var colorClass = colors[t] || colors.info;
    var iconClass = icons[t] || icons.info;

    var container = ensureContainer();

    var icon = window.tstsEl("i", { className: "fas " + iconClass + " text-lg flex-shrink-0" });
    var text = window.tstsEl("span", { className: "text-sm font-medium" }, String(msg || ""));
    var closeBtn = window.tstsEl("button", {
      className: "ml-2 text-white/80 hover:text-white transition flex-shrink-0",
      type: "button"
    }, [window.tstsEl("i", { className: "fas fa-times" })]);
    closeBtn.setAttribute("aria-label", "Close");

    var toast = window.tstsEl("div", {
      className: colorClass + " px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto transform translate-x-full opacity-0 transition-all duration-300 max-w-sm"
    }, [icon, text, closeBtn]);

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        toast.classList.remove("translate-x-full", "opacity-0");
        toast.classList.add("translate-x-0", "opacity-100");
      });
    });

    var dismiss = function() {
      toast.classList.remove("translate-x-0", "opacity-100");
      toast.classList.add("translate-x-full", "opacity-0");
      setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    };

    closeBtn.addEventListener("click", dismiss);
    setTimeout(dismiss, 5000);
  };
})();

// WS-FE-08: Branded confirmation modal (replaces confirm())
window.tstsConfirm = function(msg, opts) {
  return new Promise(function(resolve) {
    var options = opts || {};
    var confirmText = options.confirmText || "Confirm";
    var cancelText = options.cancelText || "Cancel";
    var isDestructive = options.destructive === true;

    var overlay = window.tstsEl("div", {
      className: "fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200"
    });

    var icon = window.tstsEl("div", {
      className: "w-12 h-12 rounded-full flex items-center justify-center mb-4 " + (isDestructive ? "bg-red-100" : "bg-orange-100")
    }, [
      window.tstsEl("i", { className: "fas fa-question text-xl " + (isDestructive ? "text-red-600" : "text-orange-600") })
    ]);

    var message = window.tstsEl("p", { className: "text-gray-700 text-center mb-6" }, String(msg || "Are you sure?"));

    var cancelBtn = window.tstsEl("button", {
      className: "flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition",
      type: "button"
    }, cancelText);

    var confirmBtn = window.tstsEl("button", {
      className: "flex-1 px-4 py-2.5 rounded-lg font-medium transition " + (isDestructive ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-900 text-white hover:bg-black"),
      type: "button"
    }, confirmText);

    var buttons = window.tstsEl("div", { className: "flex gap-3" }, [cancelBtn, confirmBtn]);

    var modal = window.tstsEl("div", {
      className: "bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 transform scale-95 opacity-0 transition-all duration-200"
    }, [icon, message, buttons]);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        overlay.classList.remove("opacity-0");
        overlay.classList.add("opacity-100");
        modal.classList.remove("scale-95", "opacity-0");
        modal.classList.add("scale-100", "opacity-100");
      });
    });

    var cleanup = function(result) {
      overlay.classList.remove("opacity-100");
      overlay.classList.add("opacity-0");
      modal.classList.remove("scale-100", "opacity-100");
      modal.classList.add("scale-95", "opacity-0");
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    };

    cancelBtn.addEventListener("click", function() { cleanup(false); });
    confirmBtn.addEventListener("click", function() { cleanup(true); });
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) cleanup(false);
    });
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", handler);
        cleanup(false);
      }
    });

    // Focus trap
    confirmBtn.focus();
  });
};

// WS-FE-09: Branded prompt modal (replaces prompt())
window.tstsPrompt = function(msg, defaultValue, opts) {
  return new Promise(function(resolve) {
    var options = opts || {};
    var confirmText = options.confirmText || "Submit";
    var cancelText = options.cancelText || "Cancel";
    var placeholder = options.placeholder || "";
    var minLength = options.minLength || 0;

    var overlay = window.tstsEl("div", {
      className: "fixed inset-0 bg-black/50 z-[9998] flex items-center justify-center p-4 opacity-0 transition-opacity duration-200"
    });

    var icon = window.tstsEl("div", {
      className: "w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-orange-100"
    }, [
      window.tstsEl("i", { className: "fas fa-pencil-alt text-xl text-orange-600" })
    ]);

    var message = window.tstsEl("p", { className: "text-gray-700 text-center mb-4" }, String(msg || "Enter value:"));

    var input = window.tstsEl("input", {
      type: "text",
      className: "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-400 outline-none transition mb-2",
      placeholder: placeholder,
      value: String(defaultValue || "")
    });

    var errorEl = window.tstsEl("p", { className: "text-red-500 text-xs mb-4 h-4" });

    var cancelBtn = window.tstsEl("button", {
      className: "flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition",
      type: "button"
    }, cancelText);

    var submitBtn = window.tstsEl("button", {
      className: "flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-black transition",
      type: "button"
    }, confirmText);

    var buttons = window.tstsEl("div", { className: "flex gap-3" }, [cancelBtn, submitBtn]);

    var modal = window.tstsEl("div", {
      className: "bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 transform scale-95 opacity-0 transition-all duration-200"
    }, [icon, message, input, errorEl, buttons]);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        overlay.classList.remove("opacity-0");
        overlay.classList.add("opacity-100");
        modal.classList.remove("scale-95", "opacity-0");
        modal.classList.add("scale-100", "opacity-100");
      });
    });

    var cleanup = function(result) {
      overlay.classList.remove("opacity-100");
      overlay.classList.add("opacity-0");
      modal.classList.remove("scale-100", "opacity-100");
      modal.classList.add("scale-95", "opacity-0");
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
      }, 200);
    };

    var validate = function() {
      var val = String(input.value || "").trim();
      if (minLength > 0 && val.length < minLength) {
        errorEl.textContent = "Must be at least " + minLength + " characters";
        return null;
      }
      errorEl.textContent = "";
      return val;
    };

    cancelBtn.addEventListener("click", function() { cleanup(null); });
    submitBtn.addEventListener("click", function() {
      var val = validate();
      if (val !== null) cleanup(val);
    });
    input.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        var val = validate();
        if (val !== null) cleanup(val);
      }
    });
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) cleanup(null);
    });
    document.addEventListener("keydown", function handler(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", handler);
        cleanup(null);
      }
    });

    // Focus input
    input.focus();
    input.select();
  });
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
  (function ensureLocalIconCss() {
    try {
      const id = "tsts-icon-font";
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "/css/icon-font.css?v=20260209";
      link.referrerPolicy = "no-referrer";
      document.head.appendChild(link);
    } catch (_) {}
  })();

  const isLocal = (location.hostname === "localhost" || location.hostname === "127.0.0.1");
  const runtimeCfg = (window.__TSTS_RUNTIME__ && typeof window.__TSTS_RUNTIME__ === "object")
    ? window.__TSTS_RUNTIME__
    : {};
  const runtimeApiBase = String(runtimeCfg.apiBase || runtimeCfg.API_BASE || "").trim().replace(/\/$/, "");
  const runtimeCloudinaryUrl = String(runtimeCfg.cloudinaryUrl || runtimeCfg.CLOUDINARY_URL || "").trim();

  // Optional override for QA:
  // localStorage.setItem("API_BASE", "http://localhost:4000");
  const storedBase = (() => {
    try { return localStorage.getItem("API_BASE") || ""; } catch (_) { return ""; }
  })();
  const storedCloudinary = (() => {
    try { return localStorage.getItem("CLOUDINARY_URL") || ""; } catch (_) { return ""; }
  })();

  // Runtime config priority: localStorage override > runtime config > local default > same-origin relative
  let apiOrigin = String(storedBase || runtimeApiBase || (isLocal ? "http://localhost:4000" : "")).trim().replace(/\/$/, "");
  if (apiOrigin && /\/api$/i.test(apiOrigin)) apiOrigin = apiOrigin.replace(/\/api$/i, "");
  if (apiOrigin && apiOrigin.charAt(0) === "/") apiOrigin = "";
  window.API_BASE = apiOrigin;
  // Cloudinary config (single-truth; used by profile.js / host.js)
  window.CLOUDINARY_URL = String(window.CLOUDINARY_URL || runtimeCloudinaryUrl || storedCloudinary || "").trim();


  // === SEC-002: Cookie-based auth (no localStorage tokens) ===
  // CSRF token is in cookie (non-HttpOnly) - read directly for double-submit pattern
  // This ensures CSRF works across tabs (cookies are shared, sessionStorage is not)
  
  const CSRF_COOKIE_NAME = window.__TSTS_CSRF_COOKIE__ || "tsts_csrf";
  
  // SEC-002: Response unwrapper helper for normalized { ok, data } responses
  window.tstsUnwrap = function(payload) {
    if (payload && payload.data !== undefined) return payload.data;
    return payload;
  };
  
  // Get CSRF token directly from cookie (double-submit pattern)
  // Cookie is non-HttpOnly so JS can read it
  function __getCsrfToken() {
    try {
      const cookies = String(document.cookie || "");
      const parts = cookies.split(";");
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (part.startsWith(CSRF_COOKIE_NAME + "=")) {
          return decodeURIComponent(part.slice(CSRF_COOKIE_NAME.length + 1));
        }
      }
      return "";
    } catch (_) { return ""; }
  }

  // SEC-002: setAuth now handles user data (no auth token in localStorage)
  // CSRF token is managed by cookie - no need to store separately
  window.setAuth = function (csrfToken, user) {
    try {
      // user: store in localStorage for UI display (non-sensitive)
      if (user != null) localStorage.setItem("tsts_user", JSON.stringify(user));
      else localStorage.removeItem("tsts_user");
      
      // Clean up legacy keys
      try { localStorage.removeItem("token"); } catch (_) {}
      try { localStorage.removeItem("user"); } catch (_) {}
    } catch (_) {}
  };

  // Deprecated: auth token is now in HttpOnly cookie, not accessible to JS
  window.getAuthToken = function () {
    return ""; // Token is in HttpOnly cookie, not accessible
  };

  // FE-019: Clear all auth state on logout
  // Note: CSRF cookie is cleared by backend on logout, not by frontend
  window.clearAuth = function () {
    try {
      localStorage.removeItem("tsts_user");
      // Clean up legacy keys
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (_) {}
  };

  window.getAuthUser = function () {
    try {
      const newUser = localStorage.getItem("tsts_user");
      if (newUser) return JSON.parse(newUser);
      return {};
    } catch (_) { return {}; }
  };

  function normalizePath(path) {
    if (!path) return "/";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    if (!path.startsWith("/")) return "/" + path;
    return path;
  }
  
  // SEC-002: authFetch uses credentials: "include" for cookie auth
  // SEC-035: Add CSRF header on state-changing requests
  // GUARD: 401 Interceptor with redirect loop guard
  window.authFetch = async function (path, opts) {
    const headers = Object.assign({}, (opts && opts.headers) || {});
    const method = (opts && opts.method) ? String(opts.method).toUpperCase() : "GET";

    // SEC-035: Add CSRF token on state-changing requests
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const csrfToken = __getCsrfToken();
      if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
    }
    
    // RF-05: Do NOT set Content-Type when body is FormData (breaks multipart boundary)
    const body = opts && opts.body;
    const isFormData = (typeof FormData !== "undefined" && body instanceof FormData);
    if (!headers["Content-Type"] && method !== "GET" && !isFormData) headers["Content-Type"] = "application/json";

    const raw = String(path || "");

    // If caller passes a full URL, do not rewrite it.
    if (/^https?:\/\//i.test(raw)) {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      try {
        return await fetch(raw, Object.assign({}, opts || {}, { headers, credentials: "include", signal: controller.signal }));
      } finally {
        clearTimeout(t);
      }
    }

    const normalized = raw.startsWith("/") ? raw : ("/" + raw);
    const apiPath = normalized.startsWith("/api/") ? normalized : ("/api" + normalized);

    const base = String(window.API_BASE || "").replace(/\/$/, "");
    const url = base + apiPath;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, Object.assign({}, opts || {}, { headers, credentials: "include", signal: controller.signal }));
      
      // RF-03: Remove redirect logic from authFetch - tstsRequireAuth is the ONLY redirect authority
      // This prevents double-redirects and ensures returnTo is always preserved

      return response;
    } finally {
      clearTimeout(t);
    }
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

  const logoBadge = tstsEl("span", { className: "inline-flex items-center justify-center h-9 w-9 rounded-full bg-orange-50 border border-orange-100" }, [
    tstsEl("img", { src: "/assets/logo-mark.png", alt: "The Shared Table Story", className: "h-7 w-7 object-contain" })
  ]);
  const logoText = tstsEl("span", { className: "leading-none" }, "The Shared Table Story");
  const logo = tstsEl("a", { href: "index.html", className: "text-2xl font-bold text-orange-600 flex items-center gap-2 font-serif" }, [logoBadge, logoText]);
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
      tstsEl("li", {}, [tstsEl("a", { href: "privacy.html", className: "hover:text-white transition" }, "Privacy Policy")]),
      tstsEl("li", {}, [tstsEl("a", { href: "policy.html", className: "hover:text-white transition" }, "Cancellation Policy")]),
      tstsEl("li", {}, [tstsEl("a", { href: "report.html", className: "hover:text-white transition" }, "Report an Issue")])
    ])
  ]);

  const grid = tstsEl("div", { className: "container mx-auto px-4 grid md:grid-cols-3 gap-8" }, [col1, col2, col3]);
  const companyInfo = tstsEl("p", { className: "text-gray-500 text-sm" }, "The Shared Table Story PTY LTD | 24 Balance Pl, Birtinya QLD 4575");
  const copyrightText = "© " + new Date().getFullYear() + " The Shared Table Story. All rights reserved.";
  const copyright = tstsEl("div", { className: "border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm space-y-2" }, [tstsEl("p", {}, copyrightText), companyInfo]);
  const footer = tstsEl("footer", { className: "bg-gray-900 text-white py-12 mt-auto" }, [grid, copyright]);
  root.appendChild(footer);
}

// 3) AUTH STATE IN NAV - DOM-safe construction
// RF-04: Gate auth UI by CSRF cookie ONLY (not localStorage - that can be stale)
function applyAuthStateToNav() {
  // Cookie auth: check if CSRF cookie exists (indicates logged-in state)
  const csrfCookie = (function() {
    try {
      const cookies = String(document.cookie || "");
      return cookies.indexOf("tsts_csrf=") >= 0;
    } catch (_) { return false; }
  })();
  // RF-04: If no CSRF cookie, treat as logged out and clear stale localStorage
  if (!csrfCookie) {
    try { window.clearAuth(); } catch (_) {}
    return;
  }

  // Desktop auth menu - click-toggle dropdown
  const desktopAuth = document.getElementById("auth-section-desktop");
  if (desktopAuth) {
    desktopAuth.textContent = "";
    const userPic = tstsEl("img", { id: "nav-user-pic", src: "/assets/avatar-default.svg", className: "w-10 h-10 rounded-full border border-gray-200" });
    const menuBtn = tstsEl("button", { id: "nav-dropdown-btn", className: "flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-full" }, [userPic]);
    menuBtn.setAttribute("aria-label", "Account menu");
    menuBtn.setAttribute("aria-expanded", "false");

    const menuLinks = [
      { href: "my-bookings.html", text: "Dashboard" },
      { href: "profile.html", text: "My Profile" },
      { href: "bookmarks.html", text: "Bookmarks" },
      { href: "connections.html", text: "Connections" }
    ];
    const dropdownItems = menuLinks.map(function(lnk) {
      return tstsEl("a", { href: lnk.href, className: "block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition" }, lnk.text);
    });
    const logoutBtn = tstsEl("button", { id: "logout-btn", className: "block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition" }, "Logout");
    dropdownItems.push(logoutBtn);
    const dropdown = tstsEl("div", { id: "nav-dropdown", className: "hidden absolute right-0 w-48 bg-white shadow-xl rounded-lg border border-gray-100 py-2 mt-2 opacity-0 -translate-y-2 transition-all duration-200" }, dropdownItems);
    dropdown.style.pointerEvents = "none";
    const wrapper = tstsEl("div", { className: "relative" }, [menuBtn, dropdown]);
    desktopAuth.appendChild(wrapper);
  }

  // Mobile auth menu
  const mobileAuth = document.getElementById("auth-section-mobile");
  if (mobileAuth) {
    mobileAuth.textContent = "";
    const mobileLinks = [
      { href: "my-bookings.html", text: "Dashboard" },
      { href: "profile.html", text: "My Profile" }
    ];
    mobileLinks.forEach(function(lnk) {
      mobileAuth.appendChild(tstsEl("a", { href: lnk.href, className: "block text-gray-700 hover:text-orange-600 font-medium py-2" }, lnk.text));
    });
    mobileAuth.appendChild(tstsEl("button", { id: "logout-btn-mobile", className: "block w-full text-left text-red-600 font-medium py-2" }, "Logout"));
  }

  attachLogoutListeners();
  initDropdownToggle();
  loadNavProfilePic();
}

// 4) MOBILE MENU
function initMobileMenu() {
  const btn = document.getElementById("mobile-menu-btn");
  const menu = document.getElementById("mobile-menu");
  if (!btn || !menu) return;
  btn.addEventListener("click", () => menu.classList.toggle("hidden"));
}

// 5) DROPDOWN TOGGLE (click-based, polished)
function initDropdownToggle() {
  const btn = document.getElementById("nav-dropdown-btn");
  const dropdown = document.getElementById("nav-dropdown");
  if (!btn || !dropdown) return;

  let isOpen = false;

  const openDropdown = () => {
    isOpen = true;
    dropdown.classList.remove("hidden");
    dropdown.style.pointerEvents = "auto";
    setTimeout(() => {
      dropdown.classList.remove("opacity-0", "-translate-y-2");
      dropdown.classList.add("opacity-100", "translate-y-0");
    }, 10);
    btn.setAttribute("aria-expanded", "true");
  };

  const closeDropdown = () => {
    if (!isOpen) return;
    isOpen = false;
    dropdown.classList.remove("opacity-100", "translate-y-0");
    dropdown.classList.add("opacity-0", "-translate-y-2");
    setTimeout(() => {
      dropdown.classList.add("hidden");
      dropdown.style.pointerEvents = "none";
    }, 200);
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isOpen) closeDropdown();
    else openDropdown();
  });

  document.addEventListener("click", (e) => {
    if (isOpen && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      closeDropdown();
      btn.focus();
    }
  });

  dropdown.addEventListener("click", (e) => {
    if (e.target.tagName === "A" || e.target.tagName === "BUTTON") {
      closeDropdown();
    }
  });
}

// 6) LOGOUT
function attachLogoutListeners() {
  const handleLogout = async () => {
    try {
      const res = await window.authFetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        try { console.warn("Logout revoke failed", res.status); } catch (_) {}
      }
    } catch (_) {
      try { console.warn("Logout revoke failed", "network"); } catch (_) {}
    }
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

// 7) NAV PROFILE PIC
async function loadNavProfilePic() {
  try {
    if (String(location.pathname || "").endsWith("/profile.html") || String(location.pathname || "").endsWith("profile.html")) return;
  } catch (_) {}

  // SEC-002: Cookie auth - check if user is logged in via CSRF cookie or stored user
  const csrfCookie = (function() {
    try {
      const cookies = String(document.cookie || "");
      return cookies.indexOf("tsts_csrf=") >= 0;
    } catch (_) { return false; }
  })();
  const img = document.getElementById("nav-user-pic");
  if (!csrfCookie || !img) return;

  try {
    const cached = (window.getAuthUser && window.getAuthUser()) || {};
    if (cached && cached.profilePic) { window.tstsSafeImg(img, cached.profilePic, "/assets/avatar-default.svg"); return; }

    const res = await window.authFetch("/api/auth/me", { method: "GET" });

    if (res.status === 401 || res.status === 403) {
      if (window.clearAuth) window.clearAuth();
      const returnTo = encodeURIComponent(location.pathname + location.search);
      location.href = "login.html?returnTo=" + returnTo;
      return;
    }

    if (!res.ok) return;
    const payload = await res.json();
    const u = (payload && (payload.data && payload.data.user)) ? payload.data.user : ((payload && payload.user) ? payload.user : payload);
    if (u && u.profilePic) window.tstsSafeImg(img, u.profilePic, "/assets/avatar-default.svg");
  } catch (_) {}
}

// === SEC-AUTH-GUARD: Single auth guard for protected pages (cookie auth) ===
// Use this at top of protected page JS to verify auth via /api/auth/me
window.tstsRequireAuth = function (opts) {
  const o = opts || {};
  const returnTo = String(o.returnTo || (location.pathname + location.search) || "");
  const loginUrl = String(o.loginUrl || "login.html");
  const q = "returnTo=" + encodeURIComponent(returnTo);

  function go() { location.replace(loginUrl + (loginUrl.indexOf("?") >= 0 ? "&" : "?") + q); }

  try {
    if (!window.authFetch) { go(); return; }
    window.authFetch("/api/auth/me", { method: "GET", on401: "redirect" })
      .then(function (res) { if (!res || !res.ok) go(); })
      .catch(function () { go(); });
  } catch (_) { go(); }
};
