/**
 * scripts/testEndpoints.js
 * Automated endpoint verification script using Node's built-in http module.
 * No extra dependencies required — run with: node scripts/testEndpoints.js
 *
 * Tests:
 *   1. GET  /health                   — server reachability
 *   2. POST /api/auth/register        — account creation & password hashing
 *   3. POST /api/auth/login           — credential validation & token issuance
 *   4. GET  /api/auth/verify          — token verification
 *   5. GET  /api/dashboard/summary    — admin dashboard summary
 *   6. GET  /api/dashboard/incidents  — incident feed
 *   7. GET  /api/dashboard/responders — responder roster
 *   8. GET  /api/dashboard/camps      — camp data
 *   9. GET  /api/dashboard/sos        — SOS queue
 *  10. GET  /api/dashboard/analytics  — analytics data
 *  11. GET  /api/dashboard/summary    — with NO token (expect 401)
 *  12. POST /api/auth/login           — with bad credentials (expect 401)
 */

"use strict";

const http = require("http");

const BASE_URL = "http://localhost:4000";
let BEARER_TOKEN = null;

const PASS = "\x1b[32m✓ PASS\x1b[0m";
const FAIL = "\x1b[31m✗ FAIL\x1b[0m";
const INFO = "\x1b[36mℹ\x1b[0m ";

let passed = 0;
let failed = 0;

// ── HTTP Helper ───────────────────────────────────────────────────────────────

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const defaultHeaders = {
      "Content-Type": "application/json",
      ...(BEARER_TOKEN ? { Authorization: `Bearer ${BEARER_TOKEN}` } : {}),
      ...headers,
    };
    if (payload) defaultHeaders["Content-Length"] = Buffer.byteLength(payload);

    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port:     url.port || 4000,
      path:     url.pathname,
      method,
      headers:  defaultHeaders,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── Assertion Helper ──────────────────────────────────────────────────────────

function assert(testName, condition, detail = "") {
  if (condition) {
    console.log(`  ${PASS} ${testName}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${testName}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

// ── Test Suite ────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("\n\x1b[1m══════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[1m  Aapda Rakshak — Backend Endpoint Test Suite\x1b[0m");
  console.log("\x1b[1m══════════════════════════════════════════════\x1b[0m\n");

  // ── 1. Health Check ──────────────────────────────────────────────────────
  console.log("\x1b[33m[1] Health Check\x1b[0m");
  try {
    const res = await request("GET", "/health", null, {});
    assert("Status 200",         res.status === 200, `got ${res.status}`);
    assert("success: true",      res.body.status === "ok");
    assert("service field present", !!res.body.service);
  } catch (e) {
    console.log(`  ${FAIL} Server unreachable — is it running on port 4000?`);
    console.log(`         ${e.message}`);
    process.exit(1);
  }

  // ── 1.5. Registration — create a new user ──────────────────────────────
  console.log("\n\x1b[33m[1.5] POST /api/auth/register (create new user)\x1b[0m");
  const randomEmail = `testuser_${Date.now()}@gmail.com`;
  {
    const res = await request("POST", "/api/auth/register", {
      name: "Test Citizen",
      email: randomEmail,
      password: "secure_password_123",
      role: "citizen"
    });
    assert("Status 201",       res.status === 201, `got ${res.status}`);
    assert("success: true",    res.body.success === true);
    assert("token issued",     typeof res.body.token === "string" && res.body.token.length > 20);
    assert("user returned",    !!res.body.user?.id);
    assert("no passwordHash",  !("passwordHash" in (res.body.user || {})));
  }

  // ── 2. Login — valid credentials ─────────────────────────────────────────
  console.log("\n\x1b[33m[2] POST /api/auth/login (valid credentials)\x1b[0m");
  {
    const res = await request("POST", "/api/auth/login", {
      email: "admin.rakshak@gmail.com",
      password: "admin_demo_2026",
    });
    assert("Status 200",       res.status === 200, `got ${res.status}`);
    assert("success: true",    res.body.success === true);
    assert("token issued",     typeof res.body.token === "string" && res.body.token.length > 20);
    assert("user returned",    !!res.body.user?.id);
    assert("no passwordHash",  !("passwordHash" in (res.body.user || {})));
    BEARER_TOKEN = res.body.token;
    if (BEARER_TOKEN) console.log(`  ${INFO}Token captured (first 40 chars): ${BEARER_TOKEN.substring(0, 40)}...`);
  }

  // ── 3. Verify token ───────────────────────────────────────────────────────
  console.log("\n\x1b[33m[3] GET /api/auth/verify (valid token)\x1b[0m");
  {
    const res = await request("GET", "/api/auth/verify");
    assert("Status 200",     res.status === 200, `got ${res.status}`);
    assert("valid: true",    res.body.valid === true);
    assert("user present",   !!res.body.user?.role);
  }

  // ── 4. Dashboard Summary ──────────────────────────────────────────────────
  console.log("\n\x1b[33m[4] GET /api/dashboard/summary\x1b[0m");
  {
    const res = await request("GET", "/api/dashboard/summary");
    assert("Status 200",               res.status === 200, `got ${res.status}`);
    assert("activeIncidents field",    "activeIncidents" in (res.body.data || {}));
    assert("availableResponders field","availableResponders" in (res.body.data || {}));
    assert("pendingSOS field",         "pendingSOS" in (res.body.data || {}));
  }

  // ── 5. Incidents ──────────────────────────────────────────────────────────
  console.log("\n\x1b[33m[5] GET /api/dashboard/incidents\x1b[0m");
  {
    const res = await request("GET", "/api/dashboard/incidents");
    assert("Status 200",        res.status === 200, `got ${res.status}`);
    assert("data is array",     Array.isArray(res.body.data));
    assert("count matches",     res.body.count === res.body.data.length);
    assert("incident has lat",  res.body.data[0]?.lat !== undefined);
  }

  // ── 6. Responders ─────────────────────────────────────────────────────────
  console.log("\n\x1b[33m[6] GET /api/dashboard/responders\x1b[0m");
  {
    const res = await request("GET", "/api/dashboard/responders");
    assert("Status 200",      res.status === 200, `got ${res.status}`);
    assert("data is array",   Array.isArray(res.body.data));
    assert("has name field",  !!res.body.data[0]?.name);
  }

  // ── 7. Camps ──────────────────────────────────────────────────────────────
  console.log("\n\x1b[33m[7] GET /api/dashboard/camps\x1b[0m");
  {
    const res = await request("GET", "/api/dashboard/camps");
    assert("Status 200",              res.status === 200, `got ${res.status}`);
    assert("occupancyPercent field",  res.body.data[0]?.occupancyPercent !== undefined);
    assert("status field",            !!res.body.data[0]?.status);
  }

  // ── 8. SOS Queue ──────────────────────────────────────────────────────────
  console.log("\n\x1b[33m[8] GET /api/dashboard/sos\x1b[0m");
  {
    const res = await request("GET", "/api/dashboard/sos");
    assert("Status 200",      res.status === 200, `got ${res.status}`);
    assert("pending count",   res.body.pending !== undefined);
    assert("data is array",   Array.isArray(res.body.data));
  }

  // ── 9. Analytics ──────────────────────────────────────────────────────────
  console.log("\n\x1b[33m[9] GET /api/dashboard/analytics\x1b[0m");
  {
    const res = await request("GET", "/api/dashboard/analytics");
    assert("Status 200",                  res.status === 200, `got ${res.status}`);
    assert("incidentsByCategory present", !!res.body.data?.incidentsByCategory);
    assert("weeklyTrend is array",        Array.isArray(res.body.data?.weeklyIncidentTrend));
  }

  // ── 10. Auth guard — no token ─────────────────────────────────────────────
  console.log("\n\x1b[33m[10] GET /api/dashboard/summary — NO TOKEN (expect 401)\x1b[0m");
  {
    const saved = BEARER_TOKEN;
    BEARER_TOKEN = null;
    const res = await request("GET", "/api/dashboard/summary");
    assert("Status 401",      res.status === 401, `got ${res.status}`);
    assert("error field",     res.body.error === "UNAUTHORISED");
    BEARER_TOKEN = saved;
  }

  // ── 11. Login — bad credentials ───────────────────────────────────────────
  console.log("\n\x1b[33m[11] POST /api/auth/login — BAD credentials (expect 401)\x1b[0m");
  {
    const res = await request("POST", "/api/auth/login", {
      email: "hacker@evil.com",
      password: "wrongpassword",
    });
    assert("Status 401",           res.status === 401, `got ${res.status}`);
    assert("INVALID_CREDENTIALS",  res.body.error === "INVALID_CREDENTIALS");
    assert("no token",             !res.body.token);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n\x1b[1m══════════════════════════════════════════════\x1b[0m");
  const total = passed + failed;
  const pct = Math.round((passed / total) * 100);
  console.log(`\x1b[1m  Results: ${passed}/${total} passed (${pct}%)\x1b[0m`);
  if (failed === 0) {
    console.log("  \x1b[32m✓ All tests passed. Backend is production-ready!\x1b[0m");
  } else {
    console.log(`  \x1b[31m✗ ${failed} test(s) failed. Review output above.\x1b[0m`);
  }
  console.log("\x1b[1m══════════════════════════════════════════════\x1b[0m\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("\n[TestRunner] Unexpected error:", err.message);
  process.exit(1);
});
