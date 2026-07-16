/**
 * controllers/authController.js
 * Handles user registration, login, and token issuance.
 */

"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");
const { findByEmail, createUser, toPublicProfile } = require("../models/UserModel");

/**
 * Register a new user securely.
 */
const register = (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // 1. Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Name, email, and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "WEAK_PASSWORD",
        message: "Password must be at least 8 characters long.",
      });
    }

    // 2. Check if user already exists
    const existingUser = findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "EMAIL_IN_USE",
        message: "An account with this email already exists.",
      });
    }

    // 3. Create the user (hashing happens automatically inside UserModel)
    const newUser = createUser({
      name,
      email,
      role: role || "citizen",
      phone: phone || "",
      password,
    });

    // 4. Automatically log them in (issue a JWT)
    const token = jwt.sign(
      {
        sub:   newUser.id,
        email: newUser.email,
        role:  newUser.role,
        name:  newUser.name,
        iat:   Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: toPublicProfile(newUser),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Issues a JWT for valid credentials using secure password comparison.
 */
const login = (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        message: "Both email and password are required.",
      });
    }

    const user = findByEmail(email);

    // Securely compare the provided password with the hashed password
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({
        success: false,
        error: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      });
    }

    const token = jwt.sign(
      {
        sub:   user.id,
        email: user.email,
        role:  user.role,
        name:  user.name,
        iat:   Math.floor(Date.now() / 1000),
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: "Authentication successful.",
      token,
      expiresIn: JWT_EXPIRES_IN,
      user: toPublicProfile(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verifies the Bearer token and returns the decoded user profile.
 */
const verify = (req, res) => {
  return res.status(200).json({
    success: true,
    valid: true,
    user: req.user,
    timestamp: new Date().toISOString(),
  });
};

module.exports = { register, login, verify };
