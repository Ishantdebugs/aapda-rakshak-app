/**
 * config/corsOptions.js
 * CORS policy — explicitly whitelists the Flutter Web dev origin.
 * In production, replace ALLOWED_ORIGIN with your deployed domain.
 */

"use strict";

const { ALLOWED_ORIGIN } = require("./env");

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) and the whitelisted frontend
    const whitelist = [ALLOWED_ORIGIN];
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
};

module.exports = corsOptions;
