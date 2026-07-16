/**
 * config/env.js
 * Centralised environment configuration with validation at startup.
 * Throws early if any required variable is missing — fast fail, no silent bugs.
 */

"use strict";

require("dotenv").config();

const REQUIRED_VARS = ["JWT_SECRET", "PORT", "ALLOWED_ORIGIN"];

REQUIRED_VARS.forEach((key) => {
  if (!process.env[key]) {
    console.error(`[Config] FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

module.exports = {
  NODE_ENV:              process.env.NODE_ENV      || "development",
  PORT:                  parseInt(process.env.PORT, 10) || 4000,
  JWT_SECRET:            process.env.JWT_SECRET,
  JWT_EXPIRES_IN:        process.env.JWT_EXPIRES_IN || "8h",
  ALLOWED_ORIGIN:        process.env.ALLOWED_ORIGIN,
  RATE_LIMIT_WINDOW_MS:  parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  RATE_LIMIT_MAX:        parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
};
