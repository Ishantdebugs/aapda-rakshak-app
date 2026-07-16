/**
 * middleware/rateLimiter.js
 * Configures express-rate-limit to protect all API routes from abuse.
 */

"use strict";

const rateLimit = require("express-rate-limit");
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require("../config/env");

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, // Default: 15 minutes
  max: RATE_LIMIT_MAX,            // Default: 200 requests per window
  standardHeaders: true,          // Return RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    error: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests from this IP. Please wait and try again.",
  },
  handler: (req, res, _next, options) => {
    console.warn(`[RateLimit] IP ${req.ip} exceeded limit on ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});

module.exports = limiter;
