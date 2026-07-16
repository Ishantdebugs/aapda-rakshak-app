/**
 * middleware/errorHandler.js
 * Centralised Express error handler — must be registered LAST in the middleware chain.
 * Catches all errors forwarded via next(err) and returns a consistent JSON shape.
 */

"use strict";

const { NODE_ENV } = require("../config/env");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  const payload = {
    success: false,
    error:   err.code || "SERVER_ERROR",
    message: err.message || "An unexpected error occurred.",
    path:    req.originalUrl,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development mode only
  if (NODE_ENV === "development") {
    payload.stack = err.stack;
  }

  console.error(`[Error] ${statusCode} ${req.method} ${req.originalUrl} — ${err.message}`);
  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
