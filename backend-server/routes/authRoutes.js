/**
 * routes/authRoutes.js
 * Public authentication endpoints (no JWT required).
 *
 *   POST /api/auth/login   — issue JWT
 *   GET  /api/auth/verify  — confirm token validity (protected)
 */

"use strict";

const { Router } = require("express");
const { register, login, verify } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = Router();

// Public — no auth guard
router.post("/register", register);
router.post("/login", login);

// Protected — must send valid Bearer token
router.get("/verify", authMiddleware, verify);
router.get("/profile", authMiddleware, verify); // Alias for verify

module.exports = router;
