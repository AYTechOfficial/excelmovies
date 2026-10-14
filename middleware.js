/* Vercel Edge Middleware — server-side access gate.
 * Every request without a valid `em_gate` cookie is redirected to /gate.html.
 * Page content is never served to visitors without the code. */
import { GATE_COOKIE, tokenFor } from "./lib/gate.mjs";

export default async function middleware(request) {
  const cookies = request.headers.get("cookie") || "";
  const match = cookies.match(new RegExp(GATE_COOKIE + "=([A-Za-z0-9]+)"));
  if (match && match[1] === (await tokenFor())) return; /* authorized — serve normally */

  return Response.redirect(new URL("/gate", request.url), 302);
}

/* Run on everything except the gate page itself and the login endpoint. */
export const config = {
  matcher: ["/((?!gate.html?|api/login).*)"]
};
