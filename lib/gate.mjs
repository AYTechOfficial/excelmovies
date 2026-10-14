/* Access-gate config — THE one file to edit when you change the access code.
 * Shared by middleware.js (edge) and api/login.js (server), both server-side:
 * the code below is NEVER sent to the browser. */

/* ⬇ CHANGE YOUR ACCESS CODE HERE ⬇ */
export const ACCESS_CODE = "SHIVIKA001";

export const GATE_COOKIE = "em_gate";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; /* 30 days */

/* HMAC-SHA256 token derived from the code. A visitor who knows the cookie value
 * cannot derive the code from it, and the value can't be forged without the code. */
export async function tokenFor() {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(ACCESS_CODE + "|em-gate-key-v1"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("em-gate-v1"));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
