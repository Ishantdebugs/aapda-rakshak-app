/**
 * models/UserModel.js
 * Persistent SQLite user store with bcryptjs password hashing.
 */

"use strict";

const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

// Connect to SQLite file (creates it if it doesn't exist)
const dbPath = path.join(__dirname, "..", "database.sqlite");
const db = new Database(dbPath, { verbose: null });

// Ensure users table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    passwordHash TEXT NOT NULL,
    verified INTEGER DEFAULT 1,
    createdAt TEXT NOT NULL
  )
`);

// ── Database Queries ─────────────────────────────────────────────────────────

const findByEmailStmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
const findByIdStmt = db.prepare("SELECT * FROM users WHERE id = ?");
const insertUserStmt = db.prepare(`
  INSERT INTO users (id, name, email, role, phone, passwordHash, verified, createdAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

/**
 * Find a user by email (case-insensitive).
 * @param {string} email
 * @returns {Object|undefined}
 */
const findByEmail = (email) => findByEmailStmt.get(email);

/**
 * Find a user by id.
 * @param {string} id
 * @returns {Object|undefined}
 */
const findById = (id) => findByIdStmt.get(id);

/**
 * Create a new user with a hashed password.
 * @param {Object} userData
 * @returns {Object} The created user profile
 */
const createUser = ({ name, email, role, phone, password }) => {
  // Hash the password securely
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  // Generate a random ID (e.g., usr-123456789)
  const id = `usr-${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();

  insertUserStmt.run(
    id,
    name,
    email,
    role || "citizen",
    phone || "",
    passwordHash,
    1, // verified
    createdAt
  );

  return findById(id);
};

/**
 * Return a safe public profile (strips password hash).
 * @param {Object} user
 * @returns {Object}
 */
const toPublicProfile = ({ passwordHash, ...rest }) => rest;

// ── Database Seeding ──────────────────────────────────────────────────────────

// Seed the database with the initial 3 mock users if it's empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;

if (userCount === 0) {
  console.log("[Database] Seeding initial mock users into SQLite...");
  createUser({ name: "Ramesh Sharma", email: "ramesh.sharma@gmail.com", role: "citizen", phone: "+91 98765 43210", password: "citizen_demo_2026" });
  createUser({ name: "Rescue Squad Unit 4", email: "responder.squad4@gmail.com", role: "responder", phone: "+91 88888 22222", password: "responder_demo_2026" });
  createUser({ name: "System Administrator", email: "admin.rakshak@gmail.com", role: "admin", phone: "+91 99999 11111", password: "admin_demo_2026" });
  console.log("[Database] Seeding complete.");
}

module.exports = { findByEmail, findById, createUser, toPublicProfile, db };
