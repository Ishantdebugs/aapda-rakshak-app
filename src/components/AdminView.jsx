import React, { useState, useEffect } from "react";
import { translations } from "../utils/translations";
import InteractiveMap from "./InteractiveMap";
import PieChart from "./charts/PieChart";
import BarChart from "./charts/BarChart";
import LineChart from "./charts/LineChart";
import {
  ShieldAlert, Radio, ShieldCheck, Database, Award,
  MapPin, AlertTriangle, UserCheck, Trash2, Send,
  Users, Activity, Bell, CloudRain, Thermometer, Wind,
  Truck, Package, HeartPulse, Droplets, Home, Phone,
  CheckCircle, Clock, TrendingUp, Zap, FileText, Eye
} from "lucide-react";

// ── MOCK DATA (Firebase-ready: swap with Firestore .onSnapshot()) ─────────────
const DISTRICT_REPORTS = [
  { label: "North", value: 23, color: "#6366f1" },
  { label: "South", value: 31, color: "#8b5cf6" },
  { label: "East",  value: 18, color: "#06b6d4" },
  { label: "West",  value: 27, color: "#3b82f6" },
  { label: "Noida", value: 14, color: "#10b981" },
  { label: "Gurgaon", value: 9, color: "#f59e0b" },
];

const DAILY_REPORTS_7D = [
  { label: "Mon", value: 8 },
  { label: "Tue", value: 14 },
  { label: "Wed", value: 11 },
  { label: "Thu", value: 19 },
  { label: "Fri", value: 27 },
  { label: "Sat", value: 22 },
  { label: "Sun", value: 16 },
];

const WEATHER_DATA = {
  temp: "34°C",
  feels: "38°C",
  rain: "72%",
  humidity: "81%",
  wind: "18 km/h",
  condition: "Heavy Rain Warning",
  icon: "🌧️"
};

const NEARBY_NOTIFICATIONS = [
  { id: 1, type: "rescue", icon: "✅", text: "Priya Kapoor rescued — Sector 7 flood cleared", time: "8m ago", color: "text-emerald-400" },
  { id: 2, type: "incident", icon: "🚨", text: "New fire incident: Lotus Heights Tower C", time: "12m ago", color: "text-red-400" },
  { id: 3, type: "shelter", icon: "🏕️", text: "Shelter opened: Community Hall Sector 14 (120 beds)", time: "35m ago", color: "text-blue-400" },
  { id: 4, type: "weather", icon: "⛈️", text: "IMD Weather Warning: Heavy rain expected next 6h", time: "1h ago", color: "text-amber-400" },
  { id: 5, type: "rescue", icon: "✅", text: "Sushma Devi evacuated — Medical team arrived", time: "2h ago", color: "text-emerald-400" },
];

// Severity badge helper
function SeverityBadge({ severity }) {
  const map = {
    critical: "bg-red-700 text-slate-900 dark:text-white border-red-600",
    high: "bg-orange-900/70 text-orange-400 border-orange-800",
    medium: "bg-amber-900/70 text-amber-400 border-amber-800",
    low: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700",
  };
  return (
    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${map[severity] || map.medium}`}>
      {severity}
    </span>
  );
}

// Animated stat card
function StatCard({ icon: Icon, count, label, subtitle, color, glow }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const end = Number(count) || 0;
    if (end === 0) return;
    let start = 0;
    const step = Math.ceil(end / 20);
    const interval = setInterval(() => {
      start = Math.min(start + step, end);
      setVal(start);
      if (start >= end) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [count]);

  return (
    <div className={`relative bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col gap-2 hover:border-opacity-70 transition-all shadow-lg group overflow-hidden ${glow}`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">LIVE</span>
      </div>
      <div>
        <div className="text-2xl font-black text-slate-900 dark:text-white font-display leading-none">{val}</div>
        <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5 leading-tight">{label}</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5 leading-tight">{subtitle}</div>
      </div>
    </div>
  );
}

// Resource progress card
function ResourceCard({ icon, label, current, max, color, unit = "units" }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;
  const isLow = pct < 30;
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{label}</span>
        </div>
        <span className={`text-xs font-black font-mono ${isLow ? "text-red-400 animate-pulse" : "text-slate-800 dark:text-slate-200"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: animated ? `${pct}%` : "0%", backgroundColor: isLow ? "#ef4444" : color }} />
      </div>
      <div className="flex justify-between text-[9px] text-slate-600 font-mono">
        <span>{current} {unit}</span><span>/ {max} {unit}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminView({
  language,
  offline,
  incidents = [],
  responders = [],
  camps = [],
  setCamps,
  broadcastAlerts = [],
  setBroadcastAlerts,
  activeSOS,
  volunteers = [],
  setVolunteers,
  userLocation,
  locationPermission,
  gpsAccuracy,
  locationError,
  requestGpsAccess,
  sosMessages = [],
  setSosMessages,
  setResponders,
  nearbyVolunteers = []
}) {
  const t = translations[language];
  const [newBroadcast, setNewBroadcast] = useState("");
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [notifDismissed, setNotifDismissed] = useState([]);
  const [activeAdminTab, setActiveAdminTab] = useState("overview"); // overview | sos | activity | reports

  // ── Derived analytics (Firebase-ready) ───────────────────────────────────
  const totalRescued   = sosMessages.filter(m => m.status === "resolved").length;
  const underCaution   = sosMessages.filter(m => ["dispatched", "acknowledged"].includes(m.status)).length;
  const pendingSOS     = sosMessages.filter(m => m.status === "pending").length;
  const activeRescueOps = responders.filter(r => r.status === "busy").length;
  const availableShelters = camps.filter(c => c.bedsOccupied < c.beds).length;
  const activeVolunteers  = volunteers.filter(v => v.verified).length;
  const sosToday = sosMessages.filter(m => Date.now() - m.timestamp < 86400000).length;
  const totalUsers = 1247; // Replace with Firestore users collection count

  // Incident type counts (for pie chart)
  const incidentTypes = ["flood","fire","earthquake","medical","landslide","other"];
  const incidentDistribution = incidentTypes.map(type => {
    const count = incidents.filter(inc => inc.category === type).length
      + sosMessages.filter(m => m.disasterType === type).length;
    return count;
  });

  // Population Status pie data
  const populationPie = [
    { label: "Safe / Rescued", value: totalRescued + 245, color: "#10b981" },
    { label: "Under Caution",  value: underCaution + 78, color: "#f59e0b" },
    { label: "Critical",       value: pendingSOS + 12,   color: "#ef4444" },
    { label: "Missing",        value: 6,                  color: "#6366f1" },
  ];

  const incidentPie = [
    { label: "Flood",         value: Math.max(incidentDistribution[0], 14), color: "#3b82f6" },
    { label: "Fire",          value: Math.max(incidentDistribution[1], 8),  color: "#f97316" },
    { label: "Earthquake",    value: Math.max(incidentDistribution[2], 3),  color: "#8b5cf6" },
    { label: "Medical",       value: Math.max(incidentDistribution[3], 11), color: "#10b981" },
    { label: "Landslide",     value: Math.max(incidentDistribution[4], 5),  color: "#f59e0b" },
    { label: "Other",         value: Math.max(incidentDistribution[5], 4),  color: "#64748b" },
  ];

  // Supply helpers
  const handleSupplyChange = (campId, key, value) => {
    setCamps(prev => prev.map(c => c.id === campId ? { ...c, [key]: Number(value) } : c));
  };

  const handleBroadcastSend = (e) => {
    e.preventDefault();
    if (!newBroadcast.trim()) return;
    setBroadcastAlerts([newBroadcast, ...broadcastAlerts]);
    setNewBroadcast("");
    setBroadcastSuccess(true);
    setTimeout(() => setBroadcastSuccess(false), 3000);
  };

  const handleDeleteBroadcast = (index) => {
    setBroadcastAlerts(prev => prev.filter((_, i) => i !== index));
  };

  const handleVerifyVolunteer = (volId) => {
    setVolunteers(prev => prev.map(vol => vol.id === volId ? { ...vol, verified: true } : vol));
  };

  const handleSosStatusUpdate = (sosId, newStatus) => {
    if (setSosMessages) setSosMessages(prev => prev.map(m => m.id === sosId ? { ...m, status: newStatus } : m));
  };

  // Alert level derived from active incidents
  const alertLevel = pendingSOS >= 3 ? "RED" : pendingSOS >= 1 ? "ORANGE" : "YELLOW";
  const alertMeta = {
    RED:    { label: "🔴 Red Alert — Critical Emergency", class: "bg-red-950/80 border-red-800 text-red-300", dot: "bg-red-500" },
    ORANGE: { label: "🟠 Orange Alert — High Risk Conditions", class: "bg-orange-950/60 border-orange-800 text-orange-300", dot: "bg-orange-500" },
    YELLOW: { label: "🟡 Yellow Alert — Monitoring Active", class: "bg-amber-950/60 border-amber-800 text-amber-300", dot: "bg-amber-400" },
  };
  const alert = alertMeta[alertLevel];

  const recentActivity = [...sosMessages]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  const visibleNotifications = NEARBY_NOTIFICATIONS.filter(n => !notifDismissed.includes(n.id));

  // Total food/water average from camps
  const avgFood  = camps.length ? Math.round(camps.reduce((s, c) => s + c.foodRations, 0) / camps.length) : 0;
  const avgWater = camps.length ? Math.round(camps.reduce((s, c) => s + c.waterSupply, 0) / camps.length) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">

      {/* ── OFFLINE WARNING ─────────────────────────────────────── */}
      {offline && (
        <div className="bg-red-950 border border-red-800 text-red-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow animate-pulse">
          <ShieldAlert className="w-5 h-5" />
          <span>{language === "hi" ? "कंट्रोल डेस्क ऑफलाइन: चेतावनी प्रसारण केवल स्थानीय ब्राउज़र सत्र में सहेजा जाएगा।" : "ADMIN CONSOLE OFFLINE: Safety broadcasts queued locally. Live sync suspended."}</span>
        </div>
      )}

      {/* ── LIVE EMERGENCY BANNER ────────────────────────────────── */}
      <div className={`border rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${alert.class}`}>
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full animate-pulse shrink-0 ${alert.dot}`} />
          <div>
            <span className="text-sm font-extrabold uppercase tracking-wide">{alert.label}</span>
            <p className="text-[11px] opacity-70 mt-0.5">
              ☁️ {WEATHER_DATA.condition} · {sosToday} SOS Today · {activeRescueOps} Rescue Teams Active
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Flood Watch", "Heavy Rain", "District Alert"].map(tag => (
            <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-black/30 border border-white/10 uppercase tracking-wider">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── 8 STATS CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users}      count={totalUsers}       label="Total Users"         subtitle="Registered citizens"   color="#6366f1" glow="border-slate-200 dark:border-slate-800 hover:border-indigo-900" />
        <StatCard icon={Activity}   count={incidents.length} label="Total Incidents"     subtitle="All reported events"   color="#f97316" glow="border-slate-200 dark:border-slate-800 hover:border-orange-900" />
        <StatCard icon={CheckCircle}count={totalRescued}     label="People Rescued"      subtitle="Successfully evacuated" color="#10b981" glow="border-slate-200 dark:border-slate-800 hover:border-emerald-900" />
        <StatCard icon={AlertTriangle} count={underCaution}  label="Under Caution"       subtitle="Being monitored"       color="#f59e0b" glow="border-slate-200 dark:border-slate-800 hover:border-amber-900" />
        <StatCard icon={Truck}      count={activeRescueOps}  label="Active Rescue Ops"   subtitle="Teams deployed now"    color="#ef4444" glow="border-slate-200 dark:border-slate-800 hover:border-red-900" />
        <StatCard icon={Home}       count={availableShelters}label="Available Shelters"  subtitle="Open relief camps"     color="#0ea5e9" glow="border-slate-200 dark:border-slate-800 hover:border-sky-900" />
        <StatCard icon={Award}      count={activeVolunteers} label="Active Volunteers"   subtitle="Verified & deployed"   color="#a855f7" glow="border-slate-200 dark:border-slate-800 hover:border-purple-900" />
        <StatCard icon={Bell}       count={sosToday}         label="SOS Today"           subtitle="Emergency signals"      color="#ec4899" glow="border-slate-200 dark:border-slate-800 hover:border-pink-900" />
      </div>

      {/* ── ADMIN TAB NAVIGATION ─────────────────────────────────── */}
      <div className="flex gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 overflow-x-auto">
        {[
          { id: "overview",  icon: TrendingUp,  label: "Overview" },
          { id: "sos",       icon: Bell,        label: `SOS Feed (${sosMessages.length})` },
          { id: "activity",  icon: Activity,    label: "Activity" },
          { id: "reports",   icon: FileText,    label: "Reports" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveAdminTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeAdminTab === tab.id
                ? "bg-indigo-600 text-slate-900 dark:text-white shadow"
                : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300"
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ─────────────────────────────────────────── */}
      {activeAdminTab === "overview" && (
        <>
          {/* Charts Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Pie 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg">
              <PieChart
                data={populationPie}
                size={160}
                thickness={28}
                title="Population Status"
                subtitle="Live rescue tracking"
                centerLabel="Total"
              />
            </div>

            {/* Pie 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg">
              <PieChart
                data={incidentPie}
                size={160}
                thickness={28}
                title="Incident Distribution"
                subtitle="By disaster type"
                centerLabel="Events"
              />
            </div>

            {/* Bar Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg">
              <BarChart
                data={DISTRICT_REPORTS}
                title="Reports by District"
                subtitle="Incident density map"
                height={148}
              />
            </div>
          </div>

          {/* Line Chart — full width */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg">
            <LineChart
              data={DAILY_REPORTS_7D}
              title="Daily Incident Reports — Last 7 Days"
              subtitle="Trend analysis · Firebase-ready"
              lineColor="#6366f1"
              areaColor="rgba(99,102,241,0.12)"
              height={160}
            />
          </div>

          {/* Bottom 3-col: Weather + Resources + Notifications */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* Weather Widget */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <CloudRain className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Weather</h3>
                <span className="ml-auto text-[9px] text-slate-500 dark:text-slate-500 font-mono">IMD · Mock</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{WEATHER_DATA.icon}</span>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{WEATHER_DATA.temp}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Feels like {WEATHER_DATA.feels}</div>
                  <div className="text-[10px] font-bold text-amber-400 animate-pulse">{WEATHER_DATA.condition}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: CloudRain, label: "Rain Chance", val: WEATHER_DATA.rain, color: "text-sky-400" },
                  { icon: Droplets,  label: "Humidity",    val: WEATHER_DATA.humidity, color: "text-blue-400" },
                  { icon: Wind,      label: "Wind",        val: WEATHER_DATA.wind, color: "text-slate-700 dark:text-slate-300" },
                  { icon: Thermometer, label:"Feels Like", val: WEATHER_DATA.feels, color: "text-orange-400" },
                ].map(row => (
                  <div key={row.label} className="p-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-2">
                    <row.icon className={`w-3.5 h-3.5 shrink-0 ${row.color}`} />
                    <div>
                      <div className="text-[9px] text-slate-600 uppercase tracking-wider">{row.label}</div>
                      <div className={`text-xs font-bold ${row.color}`}>{row.val}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Resources */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Package className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Emergency Resources</h3>
              </div>
              <div className="space-y-2.5">
                <ResourceCard icon="🍱" label="Food Kits"        current={avgFood}  max={100} color="#f59e0b" unit="%" />
                <ResourceCard icon="💧" label="Water Supply"     current={avgWater} max={100} color="#0ea5e9" unit="%" />
                <ResourceCard icon="💊" label="Medical Supplies" current={68}       max={100} color="#10b981" unit="%" />
                <ResourceCard icon="🚑" label="Rescue Vehicles"  current={activeRescueOps} max={responders.length || 8} color="#ef4444" unit="units" />
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Notifications</h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">{visibleNotifications.length} unread</span>
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {visibleNotifications.map(n => (
                  <div key={n.id} className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl group">
                    <span className="text-sm shrink-0 mt-0.5">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] leading-snug ${n.color} font-semibold`}>{n.text}</p>
                      <span className="text-[9px] text-slate-600 font-mono">{n.time}</span>
                    </div>
                    <button onClick={() => setNotifDismissed(d => [...d, n.id])}
                      className="text-slate-700 hover:text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs">
                      ✕
                    </button>
                  </div>
                ))}
                {visibleNotifications.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-600 italic">All caught up!</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: SOS COMMAND FEED ─────────────────────────────────── */}
      {activeAdminTab === "sos" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Live SOS Command Feed</h3>
            </div>
            <span className="text-[10px] font-mono bg-red-950 border border-red-900 text-red-400 px-2 py-0.5 rounded">
              {sosMessages.filter(m => m.status === "pending").length} Pending
            </span>
          </div>

          {sosMessages.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No SOS signals in queue.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {[...sosMessages].sort((a,b) => b.timestamp - a.timestamp).map(sos => {
                const statusMap = {
                  pending:      "bg-amber-950 text-amber-400 border-amber-800",
                  acknowledged: "bg-blue-950 text-blue-400 border-blue-800",
                  dispatched:   "bg-orange-950 text-orange-400 border-orange-800",
                  resolved:     "bg-emerald-950 text-emerald-400 border-emerald-800",
                };
                const disasterEmoji = { flood:"🌊", fire:"🔥", earthquake:"🏚️", medical:"🩺", other:"⚠️" };
                const timeSince = Math.floor((Date.now() - sos.timestamp) / 60000);
                return (
                  <div key={sos.id} className={`p-4 border rounded-xl space-y-2.5 transition-colors ${
                    sos.status === "pending" ? "border-red-800/60 bg-red-950/20" :
                    sos.status === "resolved" ? "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/30" :
                    "border-orange-800/60 bg-orange-950/20"
                  }`}>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <SeverityBadge severity={sos.severity} />
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                          {disasterEmoji[sos.disasterType] || "⚠️"} {sos.disasterType}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${statusMap[sos.status]}`}>
                          {sos.status}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500">{timeSince}m ago</span>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{sos.citizenName}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{sos.address}</p>
                      </div>
                      <a href={`tel:${sos.phone}`} className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono">
                        <Phone className="w-3 h-3" /> {sos.phone}
                      </a>
                    </div>

                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">{sos.description}</p>

                    {sos.imageBase64 && (
                      <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[80px] flex bg-white dark:bg-slate-900">
                        <img src={sos.imageBase64} alt="SOS evidence" className="object-cover w-full h-[80px]" />
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800/60 pt-2">
                      <MapPin className="w-3 h-3" />
                      <span>{sos.lat?.toFixed(4)}, {sos.lng?.toFixed(4)}</span>
                      {sos.assignedResponderName && (
                        <span className="ml-auto text-blue-400">→ {sos.assignedResponderName}</span>
                      )}
                    </div>

                    {/* Admin actions */}
                    {sos.status !== "resolved" && (
                      <div className="flex gap-2 pt-1">
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${sos.lat},${sos.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-lg cursor-pointer">
                          🗺️ Map
                        </a>
                        {sos.status === "pending" && (
                          <button onClick={() => handleSosStatusUpdate(sos.id, "acknowledged")}
                            className="flex-1 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg cursor-pointer">
                            ✅ Acknowledge
                          </button>
                        )}
                        <button onClick={() => handleSosStatusUpdate(sos.id, "resolved")}
                          className="flex-1 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg cursor-pointer">
                          🟢 Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RECENT ACTIVITY ─────────────────────────────────── */}
      {activeAdminTab === "activity" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Recent Activity Feed</h3>
          </div>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                No recent activity.
              </div>
            ) : recentActivity.map((item, i) => {
              const timeSince = Math.floor((Date.now() - item.timestamp) / 60000);
              const typeColor = { flood:"text-blue-400", fire:"text-red-400", medical:"text-emerald-400", earthquake:"text-amber-400", other:"text-slate-500 dark:text-slate-400" };
              return (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:border-slate-700 transition-colors">
                  <div className="text-lg shrink-0 mt-0.5">
                    {{ flood:"🌊", fire:"🔥", earthquake:"🏚️", medical:"🩺", other:"⚠️" }[item.disasterType] || "⚠️"}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className={`text-xs font-black uppercase ${typeColor[item.disasterType] || typeColor.other}`}>
                        {item.disasterType?.toUpperCase()} Emergency
                      </span>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug">{item.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-500 font-mono">
                      <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {item.address || "Unknown Location"}</span>
                      <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {timeSince}m ago</span>
                      <span className={`font-bold uppercase ${
                        item.status === "resolved" ? "text-emerald-400" :
                        item.status === "dispatched" ? "text-orange-400" : "text-amber-400"
                      }`}>{item.status}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB: REPORTS (Map + Incident List) ────────────────────── */}
      {activeAdminTab === "reports" && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <InteractiveMap
              language={language}
              incidents={incidents}
              responders={responders}
              camps={camps}
              activeSOS={activeSOS}
              role="admin"
              offline={offline}
              userLocation={userLocation}
              locationPermission={locationPermission}
              gpsAccuracy={gpsAccuracy}
              locationError={locationError}
              requestGpsAccess={requestGpsAccess}
            />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <Eye className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Incident Overview</h3>
                <span className="ml-auto text-[10px] font-mono text-slate-500 dark:text-slate-500">{incidents.length} total</span>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {incidents.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-500">No incidents reported.</div>
                ) : incidents.map(inc => (
                  <div key={inc.id} className={`p-3 border rounded-xl text-xs ${
                    inc.status === "resolved" ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 opacity-60" :
                    inc.severity === "high" ? "border-red-900/60 bg-red-950/20" :
                    "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30"
                  }`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-slate-900 dark:text-white uppercase text-[10px] truncate">{inc.title}</span>
                      <SeverityBadge severity={inc.severity} />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug truncate">{inc.description}</p>
                    <div className="flex justify-between items-center mt-1.5 text-[9px] font-mono text-slate-600">
                      <span>📍 {inc.coords}</span>
                      <span className={inc.status === "resolved" ? "text-emerald-500" : "text-amber-400"}>
                        {inc.status?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CAMP SUPPLY TRACKER ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <Database className="w-5 h-5 text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{t.adminReliefCamps}</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-500">Real-time resources & shelter allocation logs</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {camps.map((camp) => {
            const bedsRatio = camp.bedsOccupied / camp.beds;
            const isBedsLow = bedsRatio >= 0.9;
            const isFoodLow = camp.foodRations < 35;
            const isWaterLow = camp.waterSupply < 30;
            return (
              <div key={camp.id} className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl relative space-y-4 hover:border-slate-300 dark:border-slate-700 transition-colors">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate">{camp.name}</h4>
                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase tracking-widest block mt-0.5">Camp #{camp.id}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">{t.adminCampsBeds}:</span>
                    <span className={`font-mono font-bold ${isBedsLow ? "text-red-500 animate-pulse" : "text-slate-700 dark:text-slate-300"}`}>{camp.bedsOccupied} / {camp.beds}</span>
                  </div>
                  <input type="range" min="0" max={camp.beds} value={camp.bedsOccupied}
                    onChange={(e) => handleSupplyChange(camp.id, "bedsOccupied", e.target.value)}
                    className="w-full accent-blue-600 cursor-pointer h-1 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">Food Rations:</span>
                    <span className={`font-mono font-bold ${isFoodLow ? "text-amber-500" : "text-emerald-400"}`}>{camp.foodRations}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={camp.foodRations}
                    onChange={(e) => handleSupplyChange(camp.id, "foodRations", e.target.value)}
                    className="w-full accent-amber-500 cursor-pointer h-1 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400">Water Storage:</span>
                    <span className={`font-mono font-bold ${isWaterLow ? "text-red-500 animate-pulse" : "text-emerald-400"}`}>{camp.waterSupply}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={camp.waterSupply}
                    onChange={(e) => handleSupplyChange(camp.id, "waterSupply", e.target.value)}
                    className="w-full accent-emerald-500 cursor-pointer h-1 rounded bg-slate-100 dark:bg-slate-800" />
                </div>
                {(isBedsLow || isFoodLow || isWaterLow) && (
                  <div className="p-2 bg-red-950/20 border border-red-950/50 rounded-lg text-[9px] text-red-400 leading-normal flex items-start gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isBedsLow && "Shelter max capacity! "}
                      {isFoodLow && "Critical food shortage. "}
                      {isWaterLow && "Water reserves low."}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BROADCAST + VOLUNTEER VERIFY ─────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <Radio className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{t.adminBroadcastTitle}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-500">Target warnings instantly to citizen alert tickers</p>
              </div>
            </div>
            <form onSubmit={handleBroadcastSend} className="space-y-3">
              <textarea value={newBroadcast} onChange={(e) => setNewBroadcast(e.target.value)}
                placeholder={t.adminBroadcastPlaceholder} rows="3"
                className="w-full bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-red-500 placeholder:text-slate-600 leading-normal" />
              {broadcastSuccess ? (
                <div className="p-2 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-emerald-400 font-bold text-center">
                  Emergency alert broadcasted!
                </div>
              ) : (
                <button type="submit" disabled={!newBroadcast.trim()}
                  className={`w-full py-2.5 bg-red-600 hover:bg-red-500 text-slate-900 dark:text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${!newBroadcast.trim() ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <Send className="w-3.5 h-3.5" /><span>{t.adminBroadcastSend}</span>
                </button>
              )}
            </form>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block mb-2">
                Active Broadcasts ({broadcastAlerts.length})
              </span>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {broadcastAlerts.map((alert, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px]">
                    <span className="text-red-400 font-semibold truncate max-w-[360px]">{alert}</span>
                    <button onClick={() => handleDeleteBroadcast(idx)} className="text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:text-white p-1 hover:bg-white dark:bg-slate-900 rounded cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {broadcastAlerts.length === 0 && (
                  <div className="text-center py-4 text-xs text-slate-600 italic">No active emergency broadcasts.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{t.adminVerificationTitle}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-500">Verify volunteer credentials</p>
              </div>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {volunteers.map((vol) => (
                <div key={vol.id} className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{vol.name}</span>
                      {vol.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-500 uppercase block mt-0.5">ID: {vol.license}</span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal block mt-1">{vol.roleDesc}</span>
                  </div>
                  {!vol.verified ? (
                    <button onClick={() => handleVerifyVolunteer(vol.id)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer shrink-0 touch-target">
                      {language === "hi" ? "सत्यापित करें" : "Verify"}
                    </button>
                  ) : (
                    <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest shrink-0 select-none bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded">
                      OK
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
