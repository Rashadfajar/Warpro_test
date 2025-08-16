// ================== WARPRO CORE JS ==================
// GANTI ke URL Web App GAS (deployment /exec)
window.API_BASE = "https://script.google.com/macros/s/AKfycbwLN9GfYpXb5OKy7M40lWbyYSH4v2TVMKl9haS-XEY8ofAQYTZn1LmsTLq8lVeXGyuE8Q/exec";

// ADMIN_KEY harus sama dengan Script Properties (ADMIN_KEY) di GAS
const WARPRO = {
  ADMIN_KEY: "warpro-secret-2025",
};

// --------- UTIL ---------
const sanitize = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const escapeAttr = sanitize;
const escapeText = (s = "") => String(s).replace(/</g, "&lt;");

const ss = {
  get: (k) => sessionStorage.getItem(k),
  set: (k, v) => sessionStorage.setItem(k, v),
  del: (k) => sessionStorage.removeItem(k),
  on: (o) => Object.entries(o || {}).forEach(([k, v]) => sessionStorage.setItem(k, v)),
};

// --------- API WRAPPER (POST form-encoded: no preflight) ---------
async function apiCall(action, payload = {}, { timeoutMs = 12000 } = {}) {
  if (!window.API_BASE) throw new Error("API_BASE belum di-set");

  // Susun body: form-encoded agar jadi simple request (tanpa preflight OPTIONS)
  const body = new URLSearchParams();
  body.append("action", action);
  for (const [k, v] of Object.entries(payload || {})) {
    if (v === undefined || v === null) continue;
    body.append(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  // cache buster untuk menghindari cache edge
  body.append("_", String(Date.now()));

  // Timeout
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(window.API_BASE, {
      method: "POST",
      // NOTE: jangan set Content-Type manual. Browser akan set
      // 'application/x-www-form-urlencoded;charset=UTF-8' otomatis
      // untuk URLSearchParams, dan itu tetap simple request.
      body,
      signal: ctl.signal,
    });
  } catch (e) {
    clearTimeout(t);
    throw new Error(e.name === "AbortError" ? "Request timeout" : "Network error: " + e.message);
  }
  clearTimeout(t);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? " - " + txt : ""}`);
  }

  const json = await res.json().catch(() => ({ ok: false, error: "Invalid JSON" }));
  if (!json.ok) throw new Error(json.error || "API error");
  return json.data || {};
}

// --------- AUTH HELPERS ---------
function requireLogin() {
  const ok = ss.get("isLoggedIn") === "true";
  if (!ok) {
    const to = location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
    window.location.href = to;
  }
  return ok;
}

function isAdmin() {
  return ss.get("isAdmin") === "true";
}
function currentUser() {
  return (ss.get("username") || "").trim().toLowerCase();
}

// --------- OPTIONAL: LOGOUT ---------
function logout() {
  ["isLoggedIn", "isAdmin", "username", "displayName", "email"].forEach(ss.del);
  const home = location.pathname.includes("/pages/") ? "../index.html" : "index.html";
  window.location.href = home;
}

// … (isi warpro.js kamu yang sekarang)

window.WARPRO_API = {
  apiCall,
  sanitize,
  escapeAttr,
  escapeText,
  ss,
  requireLogin,
  isAdmin,
  currentUser,
  logout,
};

// ✅ tempelkan ke window supaya bisa dideteksi loader
window.WARPRO = WARPRO;

// (opsional) beku agar tidak bisa diubah sembarangan
Object.freeze(WARPRO);
Object.freeze(WARPRO_API);
