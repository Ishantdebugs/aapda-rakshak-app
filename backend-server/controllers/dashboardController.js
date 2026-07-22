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
    title: "Flash Flood & River Inundation - Beas Valley (Mandi)",
    description: "Waterlogging exceeds 1.8 meters near riverbank. Two vehicles submerged.",
    severity: "high",
    status: "pending",
    x: 320,
    y: 190,
    lat: 31.7087,
    lng: 76.9320,
    coords: "31.7087, 76.9320",
    reportedBy: "usr-001",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 2,
    category: "fire",
    title: "Commercial Building Fire - Mall Road (Shimla)",
    description: "Electrical transformer fire spreading rapidly to wooden shop structures.",
    severity: "high",
    status: "in-progress",
    x: 580,
    y: 280,
    lat: 31.1048,
    lng: 77.1734,
    coords: "31.1048, 77.1734",
    reportedBy: "usr-001",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 3,
    category: "medical",
    title: "Landslide Trapped Citizens - NH-5 Jeori (Kinnaur)",
    description: "Rockfall blocked highway passage. Three travelers require medical evacuation.",
    severity: "medium",
    status: "pending",
    x: 480,
    y: 120,
    lat: 31.5373,
    lng: 78.2710,
    coords: "31.5373, 78.2710",
    reportedBy: "usr-001",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

const RESPONDERS = [
  { id: "resp-self", name: "SDRF Unit 4 Rescue Team (Shimla)", status: "available", type: "Alpine & Mountain Rescue", x: 200, y: 320, lat: 31.1048, lng: 77.1734, coords: "31.1048, 77.1734" },
  { id: "resp-002", name: "HP Volunteer Squad Bravo (Mandi)", status: "busy", type: "Flood Evacuation Boat", x: 500, y: 100, lat: 31.7087, lng: 76.9320, coords: "31.7087, 76.9320" },
  { id: "resp-003", name: "Kangra Rescue Team Echo", status: "available", type: "Search & Disaster Recovery", x: 680, y: 240, lat: 32.2190, lng: 76.3234, coords: "32.2190, 76.3234" },
];

const CAMPS = [
  { id: 1, name: "Ridge Maidan Central Relief Hub (Shimla)", beds: 250, bedsOccupied: 180, foodRations: 65, waterSupply: 78, x: 300, y: 180, lat: 31.1048, lng: 77.1734 },
  { id: 2, name: "Dhalpur Ground Safe Camp (Kullu)", beds: 120, bedsOccupied: 110, foodRations: 24, waterSupply: 28, x: 620, y: 90, lat: 32.2432, lng: 77.1892 },
  { id: 3, name: "Zonal Base Disaster Shelter (Mandi)", beds: 150, bedsOccupied: 45, foodRations: 92, waterSupply: 88, x: 450, y: 350, lat: 31.7087, lng: 76.9320 },
];

const SOS_MESSAGES = [
  {
    id: "sos-001",
    citizenName: "Priya Sharma",
    phone: "+91 98160 12345",
    lat: 31.1048,
    lng: 77.1734,
    address: "Lakkar Bazar, Shimla, Himachal Pradesh",
    disasterType: "flood",
    severity: "critical",
    description: "Flash flood runoff trapping family inside residence. Immediate evacuation needed.",
    status: "dispatched",
    assignedResponderName: "SDRF Unit 4 Rescue Team (Shimla)",
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "sos-002",
    citizenName: "Mohit Verma",
    phone: "+91 98055 54321",
    lat: 32.2190,
    lng: 76.3234,
    address: "Kotwali Bazar, Dharamshala, Kangra, HP",
    disasterType: "fire",
    severity: "high",
    description: "Short circuit fire in wooden structure near hillside. Need fire brigade.",
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
