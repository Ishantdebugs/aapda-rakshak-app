/**
 * routes/dashboardRoutes.js
 * All dashboard data endpoints — 100% protected by authMiddleware.
 *
 *   GET /api/dashboard/summary     — admin-level KPI overview
 *   GET /api/dashboard/incidents   — incident list (filterable)
 *   GET /api/dashboard/responders  — responder roster
 *   GET /api/dashboard/camps       — relief camp occupancy
 *   GET /api/dashboard/sos         — SOS message queue
 *   GET /api/dashboard/analytics   — chart aggregation data
 */

"use strict";

const { Router } = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getSummary,
  getIncidents,
  getResponders,
  getCamps,
  getSosQueue,
  getAnalytics,
} = require("../controllers/dashboardController");

const router = Router();

// Apply authMiddleware to every route in this router
router.use(authMiddleware);

router.get("/summary",    getSummary);
router.get("/incidents",  getIncidents);
router.get("/responders", getResponders);
router.get("/camps",      getCamps);
router.get("/sos",        getSosQueue);
router.get("/analytics",  getAnalytics);

module.exports = router;
