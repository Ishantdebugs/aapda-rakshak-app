/**
 * middleware/authMiddleware.js
 * JWT Bearer token authentication middleware.
 *
 * Flow:
 *   1. Extract token from "Authorization: Bearer <token>" header
 *   2. Verify signature using JWT_SECRET
 *   3. Lookup the user in the store to ensure they still exist/are active
 *   4. Attach decoded user payload to req.user and pass to next handler
 *
 * On failure: returns 401 with a structured error payload (never leaks internals).
 */

"use strict";

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const { findById } = require("../models/UserModel");

/**
 * Sends a standardised 401 Unauthorised response.
 * @param {import('express').Response} res
 * @param {string} message
 */
const unauthorised = (res, message) =>
  res.status(401).json({
    success: false,
    error: "UNAUTHORISED",
    message,
    timestamp: new Date().toISOString(),
  });

/**
 * authMiddleware — attach to any route that requires authentication.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  // 1. Header presence check
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return unauthorised(res, "No Bearer token provided in Authorization header.");
  }

  const token = authHeader.split(" ")[1];

  // 2. Verify JWT signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return unauthorised(res, "Token has expired. Please sign in again.");
    }
    return unauthorised(res, "Invalid or malformed token.");
  }

  // 3. Confirm user still exists in the store (guards against deleted accounts)
  const user = findById(decoded.sub);
  if (!user) {
    return unauthorised(res, "Token subject not found. Access denied.");
  }

  // 4. Attach user context to the request and continue
  req.user = {
    id:    user.id,
    name:  user.name,
    email: user.email,
    role:  user.role,
  };

  next();
};

module.exports = authMiddleware;
