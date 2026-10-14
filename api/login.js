/* POST /api/login — body: { "code": "..." }
 * Correct code  → sets HttpOnly cookie and returns 200.
 * Wrong code    → 401, nothing set. The code itself never leaves the server. */
import { timingSafeEqual } from "node:crypto";
import { ACCESS_CODE, GATE_COOKIE, COOKIE_MAX_AGE, tokenFor } from "../lib/gate.mjs";

function sameCode(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const code = (req.body && req.body.code) || "";
  if (!sameCode(code, ACCESS_CODE)) {
    res.status(401).json({ error: "Wrong access code" });
    return;
  }

  const token = await tokenFor();
  res.setHeader(
    "Set-Cookie",
    `${GATE_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
  );
  res.status(200).json({ ok: true });
}
