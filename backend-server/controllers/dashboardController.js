/**
 * controllers/dashboardController.js
 * Returns structured JSON payloads that mirror the Aapda Rakshak Flutter app
 * data models — incidents, responders, camps, SOS queue, and analytics.
 *
 * All GET /api/dashboard/* routes require a valid JWT (enforced by authMiddleware).
 */

"use strict";

// ── Mock Data Stores (replace with DB queries in production) ──────────────────

const INCIDENTS = [
  {
    id: 1,
    category: "flood",
    title: "Submerged Road & Vehicles - Block B Underpass",
    description: "Waterlogging exceeds 1.5 meters. Two vehicles stuck.",
    severity: "high",
    status: "pending",
    x: 320,
    y: 190,
    lat: 28.6145,
    lng: 77.2081,
    coords: "28.6145, 77.2081",
    reportedBy: "usr-001",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 2,
    category: "fire",
    title: "Electrical Transformer Fire - Sector 5 Market",
    description: "Transformer fire spreading rapidly to adjacent shops.",
    severity: "high",
    status: "in-progress",
    x: 580,
    y: 280,
    lat: 28.619,
    lng: 77.2155,
    coords: "28.6190, 77.2155",
    reportedBy: "usr-001",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 3,
    category: "medical",
    title: "Injured Citizen Evacuation - Block G",
    description: "Elderly resident requires medical transport.",
    severity: "medium",
    status: "pending",
    x: 480,
    y: 120,
    lat: 28.6095,
    lng: 77.2201,
    coords: "28.6095, 77.2201",
    reportedBy: "usr-001",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

const RESPONDERS = [
  { id: "resp-self", name: "Unit 4 Rescue Team (You)", status: "available", type: "Ambulance Crew", x: 200, y: 320, lat: 28.611, lng: 77.2012, coords: "28.6110, 77.2012" },
  { id: "resp-002", name: "Volunteer Squad Bravo", status: "busy", type: "Boat Evacuation", x: 500, y: 100, lat: 28.625, lng: 77.2245, coords: "28.6250, 77.2245" },
  { id: "resp-003", name: "Rescue Team Echo", status: "available", type: "Search & Rescue", x: 680, y: 240, lat: 28.6015, lng: 77.234, coords: "28.6015, 77.2340" },
];

const CAMPS = [
  { id: 1, name: "Central Sports Stadium Relief Base", beds: 250, bedsOccupied: 180, foodRations: 65, waterSupply: 78, x: 300, y: 180, lat: 28.612, lng: 77.21 },
  { id: 2, name: "North Hill High-School Safe Camp", beds: 120, bedsOccupied: 110, foodRations: 24, waterSupply: 28, x: 620, y: 90, lat: 28.628, lng: 77.195 },
  { id: 3, name: "Metro Hub Sheltered Safe Haven", beds: 150, bedsOccupied: 45, foodRations: 92, waterSupply: 88, x: 450, y: 350, lat: 28.602, lng: 77.215 },
];

const SOS_MESSAGES = [
  {
    id: "sos-001",
    citizenName: "Priya Kapoor",
    phone: "+91 91234 56789",
    lat: 28.6178,
    lng: 77.2068,
    address: "Block D, Sector 7, near Central Market",
    disasterType: "flood",
    severity: "critical",
    description: "Family of 4 trapped on rooftop. Water rising.",
    status: "dispatched",
    assignedResponderName: "Volunteer Squad Bravo",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "sos-002",
    citizenName: "Mohit Agarwal",
    phone: "+91 99876 54321",
    lat: 28.6092,
    lng: 77.2135,
    address: "Flat 302, Tower C, Lotus Heights",
    disasterType: "fire",
    severity: "high",
    description: "Kitchen gas line explosion. Fire spreading.",
    status: "pending",
    assignedResponderName: null,
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
];

// ── Controller Handlers ───────────────────────────────────────────────────────

/**
 * GET /api/dashboard/summary
 * Returns a high-level overview for the admin panel.
 */
const getSummary = (req, res) => {
  const activeIncidents = INCIDENTS.filter((i) => i.status !== "resolved").length;
  const availableResponders = RESPONDERS.filter((r) => r.status === "available").length;
  const pendingSOS = SOS_MESSAGES.filter((s) => s.status === "pending").length;
  const totalCampCapacity = CAMPS.reduce((sum, c) => sum + c.beds, 0);
  const totalOccupied = CAMPS.reduce((sum, c) => sum + c.bedsOccupied, 0);

  res.json({
    success: true,
    requestedBy: { id: req.user.id, role: req.user.role },
    data: {
      activeIncidents,
      availableResponders,
      totalResponders: RESPONDERS.length,
      pendingSOS,
      totalSOS: SOS_MESSAGES.length,
      campOccupancyRate: Math.round((totalOccupied / totalCampCapacity) * 100),
      totalCampBeds: totalCampCapacity,
      occupiedBeds: totalOccupied,
    },
    generatedAt: new Date().toISOString(),
  });
};

/**
 * GET /api/dashboard/incidents
 * Returns filtered incident list. Query: ?status=pending&category=flood
 */
const getIncidents = (req, res) => {
  const { status, category, severity } = req.query;
  let result = [...INCIDENTS];
  if (status)   result = result.filter((i) => i.status   === status);
  if (category) result = result.filter((i) => i.category === category);
  if (severity) result = result.filter((i) => i.severity === severity);

  res.json({
    success: true,
    count: result.length,
    data: result,
    filters: { status, category, severity },
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /api/dashboard/responders
 * Returns all responder units with current status.
 */
const getResponders = (req, res) => {
  res.json({
    success: true,
    count: RESPONDERS.length,
    data: RESPONDERS,
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /api/dashboard/camps
 * Returns all relief camp data with occupancy stats.
 */
const getCamps = (req, res) => {
  const campsWithStatus = CAMPS.map((c) => ({
    ...c,
    availableBeds: c.beds - c.bedsOccupied,
    occupancyPercent: Math.round((c.bedsOccupied / c.beds) * 100),
    status: (c.bedsOccupied / c.beds) >= 0.9 ? "near-full" : "available",
    lowFood: c.foodRations < 30,
    lowWater: c.waterSupply < 30,
  }));

  res.json({
    success: true,
    count: campsWithStatus.length,
    data: campsWithStatus,
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /api/dashboard/sos
 * Returns SOS message queue. Responders and admins see all; citizens see only their own.
 */
const getSosQueue = (req, res) => {
  const { role, id } = req.user;
  let result = [...SOS_MESSAGES];

  // Citizens can only see their own SOS reports (disabled for demo to allow visibility)
  // if (role === "citizen") {
  //   result = result.filter((s) => s.citizenId === id);
  // }

  res.json({
    success: true,
    count: result.length,
    pending: result.filter((s) => s.status === "pending").length,
    data: result,
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /api/dashboard/analytics
 * Returns aggregated analytics data for charts.
 */
const getAnalytics = (req, res) => {
  res.json({
    success: true,
    data: {
      incidentsByCategory: {
        flood: INCIDENTS.filter((i) => i.category === "flood").length,
        fire: INCIDENTS.filter((i) => i.category === "fire").length,
        medical: INCIDENTS.filter((i) => i.category === "medical").length,
        earthquake: 0,
        other: 0,
      },
      incidentsBySeverity: {
        high: INCIDENTS.filter((i) => i.severity === "high").length,
        medium: INCIDENTS.filter((i) => i.severity === "medium").length,
        low: INCIDENTS.filter((i) => i.severity === "low").length,
        critical: INCIDENTS.filter((i) => i.severity === "critical").length,
      },
      responderUtilization: {
        available: RESPONDERS.filter((r) => r.status === "available").length,
        busy: RESPONDERS.filter((r) => r.status === "busy").length,
        offline: RESPONDERS.filter((r) => r.status === "offline").length,
      },
      weeklyIncidentTrend: [3, 7, 5, 12, 8, 15, INCIDENTS.length],
    },
    generatedAt: new Date().toISOString(),
  });
};

module.exports = {
  getSummary,
  getIncidents,
  getResponders,
  getCamps,
  getSosQueue,
  getAnalytics,
};
