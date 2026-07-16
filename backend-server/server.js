/**
 * server.js — Aapda Rakshak Backend Entry Point
 *
 * Middleware stack (in order):
 *   helmet          → sets security HTTP headers
 *   morgan          → HTTP access logging
 *   cors            → whitelist-only CORS policy
 *   express.json    → JSON body parsing
 *   rateLimiter     → IP-level rate limiting
 *   /api/auth       → public auth routes
 *   /api/dashboard  → protected dashboard routes
 *   404 handler     → unknown route fallback
 *   errorHandler    → centralised error JSON responses
 */

"use strict";

const express      = require("express");
const helmet       = require("helmet");
const morgan       = require("morgan");
const cors         = require("cors");

const config       = require("./config/env");
const corsOptions  = require("./config/corsOptions");
const rateLimiter  = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
const authRoutes   = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── HTTP Request Logger ───────────────────────────────────────────────────────
app.use(morgan(config.NODE_ENV === "production" ? "combined" : "dev"));

// ── CORS (whitelist: http://localhost:5173) ───────────────────────────────────
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // pre-flight for all routes

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use("/api", rateLimiter);

// ── Health Check (no auth) ────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Aapda Rakshak API",
    version: "1.0.0",
    environment: config.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",      authRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ── 404 — Unknown Route ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "NOT_FOUND",
    message: `Route '${req.method} ${req.originalUrl}' does not exist.`,
    timestamp: new Date().toISOString(),
  });
});

// ── Centralised Error Handler (must be LAST) ──────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(config.PORT, () => {
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  🚨 Aapda Rakshak Backend — ${config.NODE_ENV.toUpperCase()} MODE`);
  console.log(`  🌐 Listening on     : http://localhost:${config.PORT}`);
  console.log(`  🔒 CORS Origin      : ${config.ALLOWED_ORIGIN}`);
  console.log(`  🛡️  JWT Expiry       : ${config.JWT_EXPIRES_IN}`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Endpoints:");
  console.log("    GET  /health");
  console.log("    POST /api/auth/login");
  console.log("    GET  /api/auth/verify        [protected]");
  console.log("    GET  /api/dashboard/summary  [protected]");
  console.log("    GET  /api/dashboard/incidents [protected]");
  console.log("    GET  /api/dashboard/responders [protected]");
  console.log("    GET  /api/dashboard/camps    [protected]");
  console.log("    GET  /api/dashboard/sos      [protected]");
  console.log("    GET  /api/dashboard/analytics [protected]");
  console.log("═══════════════════════════════════════════════════════");
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log("[Server] HTTP server closed. Exiting.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

module.exports = app; // export for testing
