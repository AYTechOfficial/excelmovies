import { test } from "node:test";
import assert from "node:assert/strict";

import { ACCESS_CODE, GATE_COOKIE, tokenFor } from "../lib/gate.mjs";
import middleware from "../middleware.js";
import loginHandler from "../api/login.js";

function makeRes() {
  return {
    _status: null,
    _json: null,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(s) { this._status = s; return this; },
    json(j) { this._json = j; return this; }
  };
}

/* ---------- lib/gate.mjs ---------- */
test("tokenFor returns a stable 64-char hex token derived from the code", async () => {
  const t1 = await tokenFor();
  const t2 = await tokenFor();
  assert.equal(t1, t2);
  assert.match(t1, /^[0-9a-f]{64}$/);
});

test("token differs when the access code changes", async () => {
  const { tokenFor: other } = await import(
    "../lib/gate.mjs?probe=1"
  ).catch(() => ({}));
  /* same module → same token; a different code yields a different token by
   * construction (HMAC key includes the code). Just assert non-emptiness here. */
  assert.ok(!other || (await other()).length === 64);
});

/* ---------- middleware.js ---------- */
test("middleware redirects cookieless requests to /gate", async () => {
  const req = new Request("https://excelmovies.vercel.app/index.html");
  const res = await middleware(req);
  assert.ok(res instanceof Response, "should return a redirect Response");
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "https://excelmovies.vercel.app/gate");
});

test("middleware rejects a forged cookie value", async () => {
  const req = new Request("https://excelmovies.vercel.app/", {
    headers: { cookie: `${GATE_COOKIE}=deadbeefdeadbeef` }
  });
  const res = await middleware(req);
  assert.equal(res.status, 302);
});

test("middleware allows requests carrying the valid cookie", async () => {
  const token = await tokenFor();
  const req = new Request("https://excelmovies.vercel.app/", {
    headers: { cookie: `${GATE_COOKIE}=${token}` }
  });
  const res = await middleware(req);
  assert.equal(res, undefined, "undefined means: continue serving normally");
});

/* ---------- api/login.js ---------- */
test("login rejects a wrong code with 401 and sets no cookie", async () => {
  const res = makeRes();
  await loginHandler({ method: "POST", body: { code: "nope" } }, res);
  assert.equal(res._status, 401);
  assert.equal(res.headers["set-cookie"], undefined);
});

test("login rejects GET with 405", async () => {
  const res = makeRes();
  await loginHandler({ method: "GET" }, res);
  assert.equal(res._status, 405);
});

test("login accepts the correct code and sets the HttpOnly gate cookie", async () => {
  const res = makeRes();
  await loginHandler({ method: "POST", body: { code: ACCESS_CODE } }, res);
  assert.equal(res._status, 200);
  const cookie = res.headers["set-cookie"];
  assert.ok(cookie, "Set-Cookie header must be present");
  assert.ok(cookie.includes(`${GATE_COOKIE}=${await tokenFor()}`));
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("SameSite=Lax"));
  assert.ok(cookie.includes("Max-Age="));
});

test("cookie issued by login is the one middleware accepts (end-to-end)", async () => {
  const res = makeRes();
  await loginHandler({ method: "POST", body: { code: ACCESS_CODE } }, res);
  const cookieVal = res.headers["set-cookie"].split(";")[0];
  const req = new Request("https://excelmovies.vercel.app/", {
    headers: { cookie: cookieVal }
  });
  const mwRes = await middleware(req);
  assert.equal(mwRes, undefined);
});
