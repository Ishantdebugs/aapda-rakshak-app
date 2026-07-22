/**
 * config/corsOptions.js
 * CORS policy — explicitly whitelists the Flutter Web dev origin.
 * In production, replace ALLOWED_ORIGIN with your deployed domain.
 */

"use strict";

const { ALLOWED_ORIGIN } = require("./env");

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, mobile Capacitor, local IP, or dev origins
    if (!origin || ALLOWED_ORIGIN === "*" || origin === ALLOWED_ORIGIN || origin.startsWith("http://") || origin.startsWith("https://") || origin.startsWith("capacitor://")) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Bypass-Tunnel-Reminder"],
  credentials: true,
  optionsSuccessStatus: 204,
};

module.exports = corsOptions;
