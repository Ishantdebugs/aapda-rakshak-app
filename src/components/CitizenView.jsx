import React, { useState, useEffect, useRef } from "react";
import { translations } from "../utils/translations";
import InteractiveMap from "./InteractiveMap";
import AIDamageAssessor from "./AIDamageAssessor";
import { 
  ShieldAlert, Send, Image, ShieldCheck, Heart, AlertOctagon, 
  MapPin, Phone, Compass, Info, Check, HelpCircle, Droplets, Bell
} from "lucide-react";

// ── Nearby Services mock data (Firebase-ready) ────────────────────────────────
const NEARBY_SERVICES = [
  { id: 1, type: "Hospital",        name: "AIIMS Emergency",          address: "Ansari Nagar, New Delhi",   phone: "011-26588500", dist: "1.2 km", icon: "🏥", color: "border-emerald-800 hover:border-emerald-600" },
  { id: 2, type: "Hospital",        name: "Safdarjung Hospital",      address: "Ring Road, New Delhi",       phone: "011-26707444", dist: "2.8 km", icon: "🏥", color: "border-emerald-800 hover:border-emerald-600" },
  { id: 3, type: "Police Station",  name: "Hauz Khas Police Stn",     address: "Sri Aurobindo Marg, Delhi",   phone: "011-24601411", dist: "0.9 km", icon: "🚔", color: "border-blue-800 hover:border-blue-600" },
  { id: 4, type: "Police Station",  name: "Vasant Kunj Police Stn",   address: "Vasant Kunj, New Delhi",      phone: "011-26131001", dist: "3.1 km", icon: "🚔", color: "border-blue-800 hover:border-blue-600" },
  { id: 5, type: "Fire Station",    name: "Sector 14 Fire Station",   address: "Gurugram, Haryana",           phone: "0124-2327111", dist: "4.5 km", icon: "🔥", color: "border-orange-800 hover:border-orange-600" },
  { id: 6, type: "Relief Camp",     name: "Community Hall Sector 14", address: "Gurugram, Haryana",           phone: "1800-180-4441", dist: "2.2 km", icon: "⛺", color: "border-amber-800 hover:border-amber-600" },
  { id: 7, type: "Safe Shelter",    name: "Kendriya Vidyalaya Camp",  address: "R.K. Puram, New Delhi",      phone: "011-26172030", dist: "5.0 km", icon: "🏕️", color: "border-purple-800 hover:border-purple-600" },
  { id: 8, type: "Relief Camp",     name: "NDRF Base Camp",           address: "Vasant Vihar, Delhi",        phone: "011-24363260", dist: "6.3 km", icon: "⛺", color: "border-amber-800 hover:border-amber-600" },
];

const CITIZEN_NOTIFICATIONS = [
  { id: 1, icon: "✅", text: "Your SOS has been acknowledged by Responder Ramesh Kumar", time: "5m ago",  color: "text-emerald-400" },
  { id: 2, icon: "🏕️", text: "Relief Camp opened at Community Hall Sector 14 — 120 beds available", time: "20m ago", color: "text-blue-400" },
  { id: 3, icon: "⛈️", text: "IMD Alert: Heavy rain expected. Avoid low-lying areas tonight", time: "1h ago",  color: "text-amber-400" },
  { id: 4, icon: "🚑", text: "Rescue team dispatched to your area. ETA 15 minutes", time: "2h ago",  color: "text-red-400" },
];

// Inline Citizen Notifications Component
function CitizenNotifications() {
  const [dismissed, setDismissed] = useState([]);
  const visible = CITIZEN_NOTIFICATIONS.filter(n => !dismissed.includes(n.id));
  if (visible.length === 0) return null;
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Notifications</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">{visible.length} new</span>
      </div>
      <div className="space-y-2">
        {visible.map(n => (
          <div key={n.id} className="flex items-start gap-2.5 p-2.5 bg-slate-950/50 border border-slate-800 rounded-xl group">
            <span className="text-sm shrink-0 mt-0.5">{n.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] leading-snug font-semibold ${n.color}`}>{n.text}</p>
              <span className="text-[9px] text-slate-600 font-mono">{n.time}</span>
            </div>
            <button onClick={() => setDismissed(d => [...d, n.id])}
              className="text-slate-700 hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs shrink-0">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CitizenView({ 
  language, 
  offline, 
  incidents, 
  setIncidents, 
  activeSOS, 
  setActiveSOS, 
  responders, 
  camps,
  familyMembers,
  setFamilyMembers,
  broadcastAlerts,
  userLocation,
  locationPermission,
  gpsAccuracy,
  locationError,
  requestGpsAccess,
  nearbyVolunteers = [],
  sosMessages = [],
  setSosMessages
}) {
  const t = translations[language];

  // Dynamic distance computation helper (Haversine Formula)
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const centerCoords = userLocation || { lat: 28.6139, lng: 77.2090 };
  
  // Attach distances and sort to find nearest
  const sortedVolunteers = [...nearbyVolunteers].map(vol => ({
    ...vol,
    distance: getDistance(centerCoords.lat, centerCoords.lng, vol.lat, vol.lng)
  })).sort((a, b) => a.distance - b.distance);

  const nearestVolunteer = sortedVolunteers[0];

  // SOS button press-and-hold states
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [countdown, setCountdown] = useState(null);
  
  // Incident Report form state
  const [category, setCategory] = useState("flood");
  const [sosSeverity, setSosSeverity] = useState("high");
  const [sosAddress, setSosAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photoBase64, setPhotoBase64] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // My own SOS message id tracker (to show status)
  const [mySOSId, setMySOSId] = useState(null);
  const myActiveSOS = sosMessages.find(m => m.id === mySOSId) || null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoBase64(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const pressTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Press-and-hold logic for SOS
  const handlePressStart = (e) => {
    e.preventDefault();
    if (activeSOS) return; // Already active
    
    setIsPressing(true);
    setPressProgress(0);
    
    let currentProgress = 0;
    pressTimerRef.current = setInterval(() => {
      currentProgress += 5;
      setPressProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(pressTimerRef.current);
        setIsPressing(false);
        setPressProgress(0);
        // Start 3-second cancel countdown
        startSOSCountdown();
      }
    }, 100);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }
    setIsPressing(false);
    if (pressProgress < 100) {
      setPressProgress(0);
    }
  };

  // 3-second countdown to cancel
  const startSOSCountdown = () => {
    setCountdown(3);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          triggerSOSDistress();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelSOSCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    setCountdown(null);
  };

  // Trigger SOS Distress Signal
  const triggerSOSDistress = () => {
    const lat = userLocation ? userLocation.lat : 28.61 + (Math.random() - 0.5) * 0.05;
    const lng = userLocation ? userLocation.lng : 77.20 + (Math.random() - 0.5) * 0.05;
    
    // Push to the shared global SOS queue (visible to Responders & Admin)
    const newSOSId = `sos-${Date.now()}`;
    const newSOS = {
      id: newSOSId,
      citizenName: "You (Active User)",
      phone: "+91 98765 43210",
      email: "citizen@gmail.com",
      lat, lng,
      address: sosAddress || `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      disasterType: category,
      severity: sosSeverity,
      description: description || "Emergency distress beacon activated. Immediate rescue required.",
      imageBase64: photoBase64 || null,
      timestamp: Date.now(),
      status: "pending",
      assignedResponderName: null
    };

    if (setSosMessages) setSosMessages(prev => [newSOS, ...prev]);
    setMySOSId(newSOSId);

    // Legacy activeSOS for map marker (backcompat)
    setActiveSOS({
      id: "sos-distress",
      status: "active",
      timestamp: new Date().toLocaleTimeString(),
      x: 380, y: 280,
      lat, lng,
      coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    });
  };

  const cancelActiveSOS = () => {
    setActiveSOS(null);
    if (mySOSId && setSosMessages) {
      setSosMessages(prev => prev.filter(m => m.id !== mySOSId));
    }
    setMySOSId(null);
  };

  // Submit Incident Form
  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    if (offline) {
      // Simulate queuing in local storage
      const queuedReports = JSON.parse(localStorage.getItem("queued_incidents") || "[]");
      const newQueued = {
        category,
        description,
        timestamp: new Date().toLocaleTimeString(),
        severity: "medium",
        photo: photoBase64
      };
      localStorage.setItem("queued_incidents", JSON.stringify([...queuedReports, newQueued]));
      
      setFormSuccess(true);
      setDescription("");
      setPhotoBase64(null);
      setPhotoName("");
      setTimeout(() => setFormSuccess(false), 5000);
      return;
    }

    // Online submission: update global app database
    const mapX = 200 + Math.random() * 400;
    const mapY = 150 + Math.random() * 200;
    const lat = 28.61 + (Math.random() - 0.5) * 0.05;
    const lng = 77.20 + (Math.random() - 0.5) * 0.05;

    const newIncident = {
      id: incidents.length + 1,
      category,
      title: `${category.toUpperCase()} - Reported near Block ${String.fromCharCode(65 + Math.floor(Math.random() * 8))}`,
      description,
      severity: "medium",
      status: "pending",
      x: mapX,
      y: mapY,
      lat: lat,
      lng: lng,
      coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      photo: photoBase64
    };

    setIncidents([newIncident, ...incidents]);
    setFormSuccess(true);
    setDescription("");
    setPhotoBase64(null);
    setPhotoName("");
    setTimeout(() => setFormSuccess(false), 4000);
  };

  // Triggered by AI Damage Assessor callback
  const handleAITriageResult = (assessment) => {
    // Add AI triage report to global incidents
    const mapX = 350 + Math.random() * 250;
    const mapY = 180 + Math.random() * 150;
    const lat = 28.61 + (Math.random() - 0.5) * 0.05;
    const lng = 77.20 + (Math.random() - 0.5) * 0.05;

    const aiIncident = {
      id: incidents.length + 1,
      category: "structural",
      title: assessment.title,
      description: `[AI TRIAGE] ${assessment.desc}. Recommendation: ${assessment.recommendation}`,
      severity: assessment.severity,
      status: "pending",
      x: mapX,
      y: mapY,
      lat: lat,
      lng: lng,
      coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    };

    setIncidents([aiIncident, ...incidents]);
  };

  // Handle Family Safe toggle
  const toggleMySafetyStatus = (status) => {
    setFamilyMembers(prev => 
      prev.map(member => 
        member.relation === "Self" || member.relation === "स्वयं" 
          ? { ...member, status, time: new Date().toLocaleTimeString() }
          : member
      )
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      
      {/* Live emergency alerts marquee banner */}
      {broadcastAlerts && broadcastAlerts.length > 0 && (
        <div className="bg-red-600 border-y-2 border-red-800 text-white overflow-hidden py-2 shadow-lg relative flex items-center">
          <div className="bg-red-800 px-4 py-1 text-xs font-extrabold font-display tracking-widest border-r border-red-950 uppercase z-10 animate-pulse flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CRITICAL ALERT</span>
          </div>
          <div className="flex-1 overflow-hidden relative w-full">
            <div className="animate-ticker whitespace-nowrap text-sm font-bold uppercase tracking-wider inline-block">
              {broadcastAlerts.join("   •   ")}
            </div>
          </div>
        </div>
      )}

      {/* Primary Dashboard layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: SOS & Safety Actions */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Main Distress SOS Signal trigger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col items-center text-center shadow-lg">
            
            {/* Visual background details */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-bl-full pointer-events-none"></div>

            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800 w-full justify-center">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {t.sosTitle}
              </h3>
            </div>

            {/* Giant Circular Touch SOS Trigger Button */}
            {!activeSOS && countdown === null && (
              <div className="my-6 relative">
                {/* Hold circle progress outline */}
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    stroke="#1e293b"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    stroke="#dc2626"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 84}
                    strokeDashoffset={2 * Math.PI * 84 * (1 - pressProgress / 100)}
                    className="transition-all duration-100 ease-out"
                  />
                </svg>

                {/* Primary Button center */}
                <button
                  onMouseDown={handlePressStart}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={handlePressStart}
                  onTouchEnd={handlePressEnd}
                  className={`absolute top-5 left-5 w-38 h-38 rounded-full border-4 border-red-700/80 bg-gradient-to-br from-red-600 to-red-950 flex flex-col items-center justify-center text-white transition-all cursor-pointer select-none active:scale-95 ${
                    isPressing ? "brightness-125" : "sos-pulse-ring"
                  } touch-target`}
                >
                  <AlertOctagon className="w-12 h-12 mb-1 animate-bounce" />
                  <span className="font-display font-extrabold text-sm tracking-wider uppercase">
                    {isPressing ? `${pressProgress}%` : t.sosPressHold}
                  </span>
                </button>
              </div>
            )}

            {/* Cancelable Countdown Screen */}
            {countdown !== null && (
              <div className="my-8 flex flex-col items-center py-6">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
                  {t.sosCountdown}
                </span>
                <span className="text-6xl font-black text-red-500 font-display my-2 animate-ping">
                  {countdown}
                </span>
                <button
                  onClick={cancelSOSCountdown}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer touch-target"
                >
                  {t.sosCancel}
                </button>
              </div>
            )}

            {/* Active Distress Screen */}
            {activeSOS && (
              <div className="my-4 p-4 bg-red-950/45 border border-red-500/30 rounded-xl w-full flex flex-col items-center animate-fadeIn gap-3">
                <div className="w-10 h-10 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center animate-ping">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <h4 className="text-xs font-extrabold text-red-400 uppercase tracking-widest">
                  {t.sosTriggered}
                </h4>

                {/* Live SOS Status Tracker */}
                {myActiveSOS ? (
                  <div className="w-full space-y-3">
                    {/* Step progress bar */}
                    {["pending", "acknowledged", "dispatched", "resolved"].map((step, i) => {
                      const statusOrder = ["pending", "acknowledged", "dispatched", "resolved"];
                      const currentIdx = statusOrder.indexOf(myActiveSOS.status);
                      const isDone = i <= currentIdx;
                      const isCurrent = i === currentIdx;
                      const colors = {
                        pending: "text-amber-400 border-amber-800 bg-amber-950/60",
                        acknowledged: "text-blue-400 border-blue-800 bg-blue-950/60",
                        dispatched: "text-orange-400 border-orange-800 bg-orange-950/60",
                        resolved: "text-emerald-400 border-emerald-800 bg-emerald-950/60"
                      };
                      const labels = { pending: "⏳ Pending", acknowledged: "✅ Acknowledged", dispatched: "🚒 Responder En-Route", resolved: "🟢 Rescued / Resolved" };
                      return (
                        <div key={step} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${
                          isCurrent ? colors[step] + " animate-pulse" : isDone ? "text-slate-300 border-slate-700 bg-slate-900" : "text-slate-600 border-slate-850 bg-transparent"
                        }`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isDone ? "bg-current" : "bg-slate-700"}`} />
                          {labels[step]}
                          {step === "dispatched" && myActiveSOS.assignedResponderName && (
                            <span className="ml-auto font-mono text-[9px] text-slate-400">{myActiveSOS.assignedResponderName}</span>
                          )}
                        </div>
                      );
                    })}

                    <div className="text-[9px] text-slate-500 font-mono text-center">
                      GPS: {activeSOS.coords} · Type: {myActiveSOS.disasterType?.toUpperCase()}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 leading-normal max-w-[220px] text-center">
                    {activeSOS.status === "dispatched" 
                      ? "RESCUE SQUAD dispatched! Moving to your coordinates."
                      : t.sosDispatching}
                  </p>
                )}

                <button
                  onClick={cancelActiveSOS}
                  className="mt-2 px-4 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer touch-target"
                >
                  {language === "hi" ? "संकट समाप्त करें" : "Cancel / Mark Resolved"}
                </button>
              </div>
            )}

            <p className="text-xs text-slate-400 leading-normal">
              {activeSOS ? t.sosStatusActive : countdown !== null ? "Awaiting confirm..." : t.sosSubtitle}
            </p>
          </div>

          {/* Family Safety check-in group */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Heart className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {t.familyTitle}
              </h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {t.familySubtitle}
            </p>

            {/* Check-in Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => toggleMySafetyStatus("safe")}
                className="py-2.5 bg-emerald-950/80 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-900/60 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 touch-target hover:shadow-emerald-900/10"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t.familyMarkSafe}</span>
              </button>
              
              <button
                onClick={() => toggleMySafetyStatus("danger")}
                className="py-2.5 bg-red-950/80 hover:bg-red-900/60 text-red-400 border border-red-900/60 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 touch-target hover:shadow-red-900/10"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>{t.familyMarkDanger}</span>
              </button>
            </div>

            {/* Family List Panel */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                {t.familyGroupTitle}
              </span>
              
              <div className="space-y-2">
                {familyMembers.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border bg-slate-950/20 text-xs ${
                      member.status === "safe" 
                        ? "border-emerald-900/40 hover:border-emerald-800" 
                        : "border-red-900/40 hover:border-red-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${member.status === "safe" ? "bg-emerald-400" : "bg-red-500 animate-ping"}`}></div>
                      <div>
                        <span className="font-bold text-slate-100">{member.name}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">({member.relation})</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`font-extrabold uppercase text-[10px] block ${
                        member.status === "safe" ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {member.status === "safe" ? t.familyStatusSafe : t.familyStatusDanger}
                      </span>
                      <span className="text-[9px] text-slate-500 block font-mono">{t.familyLastLocation}: {member.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Local Volunteer & Resource Circle (20 Mock Persons Listing) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-blue-400 animate-spin-slow" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  {language === "hi" ? "निकटतम स्वयंसेवक" : "Nearby Volunteers"}
                </h3>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-400">
                {nearbyVolunteers.length} Active
              </span>
            </div>

            {/* Nearest Volunteer Highlight Card */}
            {nearestVolunteer && (
              <div className="p-3.5 bg-gradient-to-r from-blue-950/60 to-slate-950/40 border border-blue-800/80 rounded-xl flex flex-col gap-2 shadow-inner">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded tracking-wider uppercase">
                    ⭐ NEAREST HELPER
                  </span>
                  <span className="text-[10px] font-mono font-bold text-blue-400">
                    {nearestVolunteer.distance.toFixed(2)} km away
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wide">
                    {nearestVolunteer.name}
                  </h4>
                  <a 
                    href={`tel:${nearestVolunteer.phone}`}
                    className="flex items-center gap-1 text-[10px] text-emerald-450 hover:text-emerald-400 font-bold bg-slate-950 border border-slate-855 px-2.5 py-1 rounded-lg"
                  >
                    <Phone className="w-3 h-3" />
                    <span>Call</span>
                  </a>
                </div>
                <div className="text-[10px] text-slate-405 leading-normal space-y-1 mt-1 border-t border-slate-850 pt-2">
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[8px] tracking-widest">Capabilities:</span>
                    <span className="text-slate-300 font-bold">{nearestVolunteer.service}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block uppercase text-[8px] tracking-widest">Supplies Offered:</span>
                    <span className="text-slate-350">{nearestVolunteer.supplies}</span>
                  </div>
                </div>

                {/* External Routing Directions button */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${centerCoords.lat},${centerCoords.lng}&destination=${nearestVolunteer.lat},${nearestVolunteer.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-center py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg shadow-md transition-colors block no-underline uppercase tracking-wide"
                >
                  Get Directions (G-Maps)
                </a>
              </div>
            )}

            {/* Scrollable list of other volunteers */}
            <div className="space-y-2 pt-1.5 max-h-[220px] overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Emergency Support Circle List
              </span>

              {sortedVolunteers.slice(1).map((vol) => (
                <div 
                  key={vol.id}
                  className="p-2.5 bg-slate-955/40 border border-slate-850 rounded-xl flex items-center justify-between text-xs hover:border-slate-800 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">{vol.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-850 text-slate-400 font-bold">
                        {vol.distance.toFixed(1)} km
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Service: <strong className="text-slate-400 font-medium">{vol.service}</strong>
                    </p>
                  </div>

                  <a 
                    href={`tel:${vol.phone}`} 
                    className="p-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg"
                    title={`Call ${vol.name}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right Column: Live Map, Forms, Survival Guides */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Incident Routing Interactive Map */}
          <InteractiveMap
            language={language}
            incidents={incidents}
            responders={responders}
            camps={camps}
            activeSOS={activeSOS}
            role="citizen"
            offline={offline}
            userLocation={userLocation}
            locationPermission={locationPermission}
            gpsAccuracy={gpsAccuracy}
            locationError={locationError}
            requestGpsAccess={requestGpsAccess}
            familyMembers={familyMembers}
            nearbyVolunteers={nearbyVolunteers}
          />

          {/* AI Damage Assessor & Report Form Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Incident Reporting Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-4">
                  <Send className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    {t.reportTitle}
                  </h3>
                </div>

                {offline && (
                  <div className="mb-4 p-2 bg-red-950/20 border border-red-900/60 rounded-xl text-[11px] text-red-400 leading-normal flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{t.reportOfflineQueued}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitReport} className="space-y-4">
                  {/* Category / Disaster Type */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {t.reportCategory}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 text-xs text-white border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 cursor-pointer touch-target"
                    >
                      <option value="flood">{t.reportCatFlood}</option>
                      <option value="fire">{t.reportCatFire}</option>
                      <option value="earthquake">{t.reportCatEarthquake}</option>
                      <option value="medical">{t.reportCatMedical}</option>
                      <option value="other">Other Emergency</option>
                    </select>
                  </div>

                  {/* Severity Picker */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Severity Level</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["critical","high","medium","low"].map(sev => (
                        <button key={sev} type="button" onClick={() => setSosSeverity(sev)}
                          className={`py-1.5 text-[9px] font-extrabold uppercase rounded-lg border transition-all cursor-pointer ${
                            sosSeverity === sev
                              ? sev === "critical" ? "bg-red-700 border-red-600 text-white" 
                                : sev === "high" ? "bg-orange-700 border-orange-600 text-white"
                                : sev === "medium" ? "bg-amber-700 border-amber-600 text-white"
                                : "bg-slate-700 border-slate-600 text-white"
                              : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-400"
                          }`}>{sev}</button>
                      ))}
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Your Location / Address</label>
                    <input
                      type="text"
                      value={sosAddress}
                      onChange={e => setSosAddress(e.target.value)}
                      placeholder="e.g. Block C, Sector 7, near school"
                      className="w-full bg-slate-950 text-xs text-white border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-red-500 placeholder:text-slate-600"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {t.reportDescription}
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows="3"
                      placeholder={t.reportPlaceholder}
                      className="w-full bg-slate-950 text-xs text-white border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-red-500 placeholder:text-slate-600 leading-normal"
                    ></textarea>
                  </div>

                  {/* Real Photo Upload */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {t.reportPhoto}
                    </label>
                    <input
                      type="file"
                      id="real-image-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById("real-image-upload").click()}
                      className={`w-full py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-target ${
                        photoBase64 
                          ? "bg-slate-800 border-red-500/50 text-red-400" 
                          : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Image className="w-4 h-4" />
                      <span>
                        {photoBase64 
                          ? `${photoName.substring(0, 18)}${photoName.length > 18 ? '...' : ''} (Uploaded)` 
                          : t.reportMockUpload}
                      </span>
                    </button>

                    {/* Base64 Live Preview image */}
                    {photoBase64 && (
                      <div className="mt-2 relative rounded-xl overflow-hidden border border-slate-800 max-h-[140px] flex justify-center bg-slate-950">
                        <img 
                          src={photoBase64} 
                          alt="Evidence preview" 
                          className="object-contain max-h-[140px] w-full"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoBase64(null);
                            setPhotoName("");
                          }}
                          className="absolute top-1.5 right-1.5 bg-red-650 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* Submitting Buttons */}
              <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between gap-4">
                {formSuccess ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50 w-full justify-center">
                    <Check className="w-4 h-4" />
                    <span>{offline ? "Report Saved to Cache!" : t.reportSuccess}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitReport}
                    disabled={!description.trim()}
                    className={`w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer touch-target active:scale-95 ${
                      !description.trim() ? "opacity-45 cursor-not-allowed" : ""
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t.reportSubmit}</span>
                  </button>
                )}
              </div>
            </div>

            {/* AI damage triage scan */}
            <AIDamageAssessor 
              language={language} 
              onTriageResult={handleAITriageResult} 
            />

          </div>

          {/* Survival guidelines & Helpline numbers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  {t.guideTitle}
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 border border-emerald-900/50 text-emerald-400 font-bold animate-pulse">
                {language === "hi" ? "ऑफ़लाइन सुरक्षित" : "OFFLINE CACHED"}
              </span>
            </div>

            {/* Survival Guide Cards Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                <h4 className="text-xs font-bold text-blue-400 mb-1.5 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{t.guideFloodTitle}</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {t.guideFloodDesc}
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                <h4 className="text-xs font-bold text-red-400 mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t.guideFireTitle}</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {t.guideFireDesc}
                </p>
              </div>

              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                <h4 className="text-xs font-bold text-amber-500 mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>{t.guideEarthquakeTitle}</span>
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {t.guideEarthquakeDesc}
                </p>
              </div>
            </div>

            {/* Emergency Hotline numbers */}
            <div className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                {t.guideContactsTitle}
              </span>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-bold">
                <a href="tel:1078" className="p-2 bg-slate-900 border border-slate-800 hover:border-red-500 rounded-lg flex items-center gap-2 text-red-400 touch-target transition-all">
                  <Phone className="w-3.5 h-3.5" />
                  <span>NDMA: 1078</span>
                </a>
                <a href="tel:102" className="p-2 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-lg flex items-center gap-2 text-emerald-400 touch-target transition-all">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Ambulance: 102</span>
                </a>
                <a href="tel:101" className="p-2 bg-slate-900 border border-slate-800 hover:border-amber-500 rounded-lg flex items-center gap-2 text-amber-550 touch-target transition-all">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Fire: 101</span>
                </a>
                <a href="tel:112" className="p-2 bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-lg flex items-center gap-2 text-blue-400 touch-target transition-all">
                  <Phone className="w-3.5 h-3.5" />
                  <span>Police: 112</span>
                </a>
              </div>
            </div>
          </div>
        </div>

      {/* ── NEARBY SERVICES ─────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <MapPin className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Nearby Services</h3>
            <p className="text-[10px] text-slate-500">Quick access to hospitals, police, shelters & relief camps</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {NEARBY_SERVICES.map(svc => (
            <div key={svc.id} className={`p-3 bg-slate-950/50 border rounded-xl space-y-2 transition-colors ${svc.color}`}>
              <div className="flex items-start justify-between">
                <span className="text-2xl">{svc.icon}</span>
                <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 uppercase">{svc.dist}</span>
              </div>
              <div>
                <div className="text-xs font-black text-white leading-tight">{svc.name}</div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{svc.type}</div>
                <div className="text-[10px] text-slate-400 mt-1 leading-snug">{svc.address}</div>
              </div>
              <div className="flex gap-1.5 pt-1">
                <a href={`tel:${svc.phone}`}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold transition-colors">
                  <Phone className="w-3 h-3" /> Call
                </a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(svc.name + ' ' + svc.address)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg text-[10px] font-bold transition-colors">
                  <MapPin className="w-3 h-3" /> Map
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CITIZEN NOTIFICATIONS ──────────────────────────────────────────── */}
      <CitizenNotifications />

      </div>
    </div>
  );
}
