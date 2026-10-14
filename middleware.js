/* Vercel Edge Middleware — server-side access gate.
 * Every request without a valid `em_gate` cookie is redirected to /gate.html.
 * Page content is never served to visitors without the code. */
import { GATE_COOKIE, tokenFor } from "./lib/gate.mjs";

export default async function middleware(request) {
  /* Path-aware exclusion (defense in depth): even if the matcher config below
   * were ignored, the gate page and login endpoint must NEVER be redirected —
   * redirecting /gate to itself would be an infinite loop. */
  const { pathname } = new URL(request.url);
  if (/^\/gate(\.html)?$/.test(pathname) || /^\/api\/login\/?$/.test(pathname)) return;

  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(new RegExp(GATE_COOKIE + "=([A-Za-z0-9]+)"));
  if (match && match[1] === (await tokenFor())) return; /* authorized — serve normally */

  return Response.redirect(new URL("/gate", request.url), 302);
}

/* Run on everything except paths starting with /gate (the handler check above
 * excludes exactly /gate and /gate.html) and the login endpoint.
 * NOTE: Vercel matchers reject capturing groups ("Capturing groups are not
 * allowed" broke the 25effd9 build) — plain alternation inside the lookahead
 * only, no capture groups. */
export const config = {
  matcher: ["/((?!gate|api/login).*)"]
};
