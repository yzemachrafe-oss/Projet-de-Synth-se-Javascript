/**
 * session.js — include on every page except main.html, always FIRST.
 *
 * Exposes three globals and one function:
 *   userId    — current user's id  (string | null)
 *   userNom   — current user's name (string | null)
 *   estAdmin  — true if the user has admin rights (boolean)
 *   deconnecter() — wipes session keys and goes back to login
 */

/* ── Global session constants ─────────────────────────────────────────────
   Using var so these become window properties and are reachable
   from every other script on the page.
───────────────────────────────────────────────────────────────────────── */
var userId = localStorage.getItem("userId");
var userNom = localStorage.getItem("userNom");
var estAdmin = localStorage.getItem("is_admin") === "true";

/* ── Guard + DOM wiring ───────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  /* 1. No session → kick to login immediately */
  if (!userId) {
    window.location.replace("../main.html");
    return;
  }

  /* 2. Write the user's name wherever the navbar expects it */
  var nomEl = document.getElementById("nom-utilisateur");
  if (nomEl) nomEl.textContent = userNom;

  /* 3. Hide everything flagged admin-only when user is not admin */
  if (!estAdmin) {
    document.querySelectorAll(".admin-seulement").forEach(function (el) {
      el.style.display = "none";
    });
  }
});

/* ── Logout ───────────────────────────────────────────────────────────── */
function deconnecter() {
  /* Remove session keys only — DB keys (colistrack_*) are preserved */
  [
    "userId",
    "userNom",
    "is_admin",
    "ct_remember_email",
    "ct_remember_pwd",
  ].forEach(function (key) {
    localStorage.removeItem(key);
  });
  window.location.replace("../index.html");
}
