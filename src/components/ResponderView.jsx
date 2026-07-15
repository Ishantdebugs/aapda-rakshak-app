import React, { useState, useEffect } from "react";
import { translations } from "../utils/translations";
import InteractiveMap from "./InteractiveMap";
import { 
  Award, ShieldAlert, CheckSquare, Clipboard, Radio, Send, 
  MapPin, Check, ChevronRight, Navigation, RefreshCw 
} from "lucide-react";

export default function ResponderView({ 
  language, 
  offline, 
  incidents, 
  setIncidents, 
  activeSOS, 
  setActiveSOS,
  responders, 
  setResponders,
  camps,
  assignedIncidentId,
  setAssignedIncidentId,
  userLocation,
  locationPermission,
  gpsAccuracy,
  locationError,
  requestGpsAccess,
  sosMessages = [],
  setSosMessages,
  userProfile
}) {
  const t = translations[language];

  // Selected responder duty state
  const [dutyStatus, setDutyStatus] = useState("available");
  // Inbox tab: 'sos' | 'queue'
  const [activeTab, setActiveTab] = useState("sos");
  // Missions resolved count today
  const [resolvedToday, setResolvedToday] = useState(1);
  
  // Personal supplies inventory
  const [inventory, setInventory] = useState({
    medKit: true,
    radio: true,
    flashlight: true,
    waterRations: 4
  });

  // Communication radio log
  const [radioMessages, setRadioMessages] = useState([
    { id: 1, sender: "Command Center", text: "Heavy rain warning sector 4. All squads on standby.", time: "16:20" },
    { id: 2, sender: "You", text: "Unit 4 checked-in. Equipped and standing by.", time: "16:24" }
  ]);
  const [typedMessage, setTypedMessage] = useState("");

  // Coordinate movement simulator for responder dispatch routing
  useEffect(() => {
    let movementTimer;
    if (assignedIncidentId) {
      const assignedIncident = assignedIncidentId === "sos-distress"
        ? activeSOS
        : incidents.find(inc => inc.id === assignedIncidentId);
      const userResponder = responders.find(r => r.id === "resp-self" || r.id === 1);
      
      if (assignedIncident && userResponder) {
        movementTimer = setInterval(() => {
          const targetX = assignedIncident.x || 350;
          const targetY = assignedIncident.y || 220;
          const currentX = userResponder.x || 200;
          const currentY = userResponder.y || 320;

          const targetLat = assignedIncident.lat || 28.6145;
          const targetLng = assignedIncident.lng || 77.2081;
          const currentLat = userResponder.lat || 28.6110;
          const currentLng = userResponder.lng || 77.2012;
          
          const dx = targetX - currentX;
          const dy = targetY - currentY;
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance > 8) {
            // Move responder closer to target (25% step speed)
            const nextX = currentX + dx * 0.25;
            const nextY = currentY + dy * 0.25;
            
            const nextLat = currentLat + (targetLat - currentLat) * 0.25;
            const nextLng = currentLng + (targetLng - currentLng) * 0.25;
            
            setResponders(prev => 
              prev.map(r => r.id === userResponder.id 
                ? { ...r, x: nextX, y: nextY, lat: nextLat, lng: nextLng, status: "busy", coords: `${nextLat.toFixed(4)}, ${nextLng.toFixed(4)}` } 
                : r
              )
            );
          } else {
            // Arrived at target: snap to final target lat/lng
            setResponders(prev => 
              prev.map(r => r.id === userResponder.id 
                ? { ...r, x: targetX, y: targetY, lat: targetLat, lng: targetLng, status: "busy", coords: `${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}` } 
                : r
              )
            );
            clearInterval(movementTimer);
          }
        }, 1200);
      }
    }
    
    return () => clearInterval(movementTimer);
  }, [assignedIncidentId]);

  // Dispatch handler
  const handleAcceptDispatch = (incidentId) => {
    setAssignedIncidentId(incidentId);
    setDutyStatus("busy");
    
    // Update responder status in db
    setResponders(prev => 
      prev.map(r => r.id === "resp-self" || r.id === 1 ? { ...r, status: "busy" } : r)
    );

    // Send radio log update
    const incidentName = incidents.find(i => i.id === incidentId)?.title || "disaster site";
    sendRadioMessage(`Unit 4 responding to dispatch request: ${incidentName}`);
  };

  const handleResolveIncident = () => {
    if (!assignedIncidentId) return;

    // Remove or resolve incident from list
    setIncidents(prev => prev.map(inc => inc.id === assignedIncidentId ? { ...inc, status: "resolved" } : inc));
    
    // Reset responder variables
    setAssignedIncidentId(null);
    setDutyStatus("available");
    setResolvedToday(n => n + 1);
    
    // Send radio log update
    sendRadioMessage("Incident resolved successfully. Sector clear. Returning to standby status.");

    // Reset responder coordinate to home base
    setResponders(prev => 
      prev.map(r => r.id === "resp-self" || r.id === 1 ? { ...r, x: 200, y: 320, status: "available" } : r)
    );
  };

  // === SOS INBOX ACTIONS ===
  const responderName = userProfile?.name || "Unit 4 Rescue Squad";

  const pendingSOSList = sosMessages.filter(m => m.status === "pending");
  const myAssignedSOS = sosMessages.find(m => m.assignedResponderName === responderName && (m.status === "dispatched" || m.status === "acknowledged"));

  const handleAcceptSOS_inbox = (sosId) => {
    if (setSosMessages) {
      setSosMessages(prev => prev.map(m => m.id === sosId
        ? { ...m, status: "dispatched", assignedResponderName: responderName }
        : m
      ));
    }
    setDutyStatus("busy");
    setResponders(prev => prev.map(r => r.id === "resp-self" || r.id === 1 ? { ...r, status: "busy" } : r));
    sendRadioMessage(`SOS accepted from citizen. Routing to location. Responder: ${responderName}`);
  };

  const handleDeclineSOS_inbox = (sosId) => {
    // Just leave as pending for another responder
    sendRadioMessage(`SOS ${sosId} declined. Staying on standby.`);
  };

  const handleResolveSOS_inbox = (sosId) => {
    if (setSosMessages) {
      setSosMessages(prev => prev.map(m => m.id === sosId ? { ...m, status: "resolved" } : m));
    }
    setDutyStatus("available");
    setResolvedToday(n => n + 1);
    setResponders(prev => prev.map(r => r.id === "resp-self" || r.id === 1 ? { ...r, status: "available" } : r));
    sendRadioMessage("Citizen rescued successfully. SOS resolved. Returning to standby.");
  };

  // Dispatch active SOS
  const handleAcceptSOS = () => {
    if (!activeSOS) return;
    setAssignedIncidentId("sos-distress");
    setDutyStatus("busy");
    
    // Convert active SOS to an incident type mapping in responder view
    setResponders(prev => 
      prev.map(r => r.id === "resp-self" || r.id === 1 ? { ...r, status: "busy" } : r)
    );
    
    setActiveSOS(prev => ({ ...prev, status: "dispatched" }));
    sendRadioMessage("CRITICAL SOS Distress signal accepted. Routing rescue squad directly to user.");
  };

  const handleResolveSOS = () => {
    setActiveSOS(null);
    setAssignedIncidentId(null);
    setDutyStatus("available");
    sendRadioMessage("Citizen rescued and evacuated. Distress threat resolved.");
    setResponders(prev => 
      prev.map(r => r.id === "resp-self" || r.id === 1 ? { ...r, x: 200, y: 320, status: "available" } : r)
    );
  };

  // Radio transmitter sender
  const sendRadioMessage = (textOverride = null) => {
    const textToSend = textOverride || typedMessage;
    if (!textToSend.trim()) return;

    const newMsg = {
      id: radioMessages.length + 1,
      sender: textOverride ? "System / Auto" : "You",
      text: textToSend,
      time: new Date().toLocaleTimeString().substring(0, 5)
    };

    setRadioMessages(prev => [...prev, newMsg]);
    if (!textOverride) setTypedMessage("");
  };

  // Sort queue: SOS/High-severity first
  const activeQueue = incidents.filter(inc => inc.status !== "resolved");

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      
      {/* Network offline warning alert bar */}
      {offline && (
        <div className="bg-red-950 border border-red-800 text-red-400 p-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow animate-pulse">
          <ShieldAlert className="w-5 h-5" />
          <span>{language === "hi" ? "ऑफलाइन ब्लैकआउट: रेडियो संचार और जीपीएस स्थानीय रूप से कैश किए गए हैं।" : "OFFLINE BLACKOUT: Radio logs and tactical paths are cached. Updates will sync locally."}</span>
        </div>
      )}

      {/* Split grid details */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column: Tactical Map Router */}
        <div className="lg:col-span-8 space-y-6">
          
          <InteractiveMap
            language={language}
            incidents={incidents}
            responders={responders}
            camps={camps}
            activeSOS={activeSOS}
            assignedIncidentId={assignedIncidentId}
            role="responder"
            offline={offline}
            userLocation={userLocation}
            locationPermission={locationPermission}
            gpsAccuracy={gpsAccuracy}
            locationError={locationError}
            requestGpsAccess={requestGpsAccess}
          />

          {/* Radio wireless receiver logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between h-[300px]">
            <div>
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 mb-3">
                <Radio className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  {t.respChatTitle}
                </h3>
              </div>

              {/* Chat Message Box */}
              <div className="space-y-2 overflow-y-auto max-h-[160px] pr-2">
                {radioMessages.map((msg) => (
                  <div key={msg.id} className="text-xs bg-slate-950/45 p-2 border border-slate-800/80 rounded-lg flex justify-between items-start gap-3">
                    <div className="leading-relaxed">
                      <strong className={msg.sender === "You" ? "text-blue-400" : msg.sender.includes("Admin") ? "text-red-400" : "text-emerald-400"}>
                        [{msg.sender}]
                      </strong>
                      <span className="text-slate-300 ml-2">{msg.text}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5">{msg.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Message input */}
            <div className="pt-3 border-t border-slate-800/80 mt-2 flex gap-2">
              <input
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder={t.respChatPlaceholder}
                className="flex-1 bg-slate-950 text-xs text-white border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => sendRadioMessage()}
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all cursor-pointer touch-target"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Priority queues & Personal checks */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Duty state controller panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Award className="w-5 h-5 text-blue-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  {t.respStatusHeader}
                </h3>
                <p className="text-[10px] text-slate-500">Unit 4 Emergency Rescue Squad</p>
              </div>
            </div>

            {/* Duty toggle buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDutyStatus("available")}
                className={`py-2 text-[10px] font-extrabold uppercase border rounded-lg transition-all cursor-pointer touch-target ${
                  dutyStatus === "available"
                    ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                    : "bg-slate-950/20 text-slate-500 border-transparent hover:text-slate-400"
                }`}
              >
                {language === "hi" ? "उपलब्ध" : "Standby"}
              </button>
              
              <button
                onClick={() => setDutyStatus("busy")}
                className={`py-2 text-[10px] font-extrabold uppercase border rounded-lg transition-all cursor-pointer touch-target ${
                  dutyStatus === "busy"
                    ? "bg-blue-950 text-blue-400 border-blue-800"
                    : "bg-slate-950/20 text-slate-500 border-transparent hover:text-slate-400"
                }`}
              >
                {language === "hi" ? "कार्यरत" : "Responding"}
              </button>

              <button
                onClick={() => setDutyStatus("offline")}
                className={`py-2 text-[10px] font-extrabold uppercase border rounded-lg transition-all cursor-pointer touch-target ${
                  dutyStatus === "offline"
                    ? "bg-slate-900 text-slate-400 border-slate-700"
                    : "bg-slate-950/20 text-slate-500 border-transparent hover:text-slate-400"
                }`}
              >
                {language === "hi" ? "बंद" : "Off Duty"}
              </button>
            </div>

            {/* Responder supplies inventory checklist */}
            <div className="pt-2.5 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                {t.respSuppliesHeader}
              </span>
              
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inventory.medKit}
                    onChange={(e) => setInventory({ ...inventory, medKit: e.target.checked })}
                    className="accent-blue-600 rounded touch-target w-4 h-4"
                  />
                  <span className="text-slate-300">Trauma Medical Kit Level III</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inventory.radio}
                    onChange={(e) => setInventory({ ...inventory, radio: e.target.checked })}
                    className="accent-blue-600 rounded touch-target w-4 h-4"
                  />
                  <span className="text-slate-300">VHF Wireless Radio Transmitter</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inventory.flashlight}
                    onChange={(e) => setInventory({ ...inventory, flashlight: e.target.checked })}
                    className="accent-blue-600 rounded touch-target w-4 h-4"
                  />
                  <span className="text-slate-300">Tactical Search Flashlight (3000lm)</span>
                </label>
                
                <div className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-850 rounded-lg text-[11px] mt-1">
                  <span className="text-slate-500">Emergency Drinking Water:</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setInventory({ ...inventory, waterRations: Math.max(0, inventory.waterRations - 1) })}
                      className="w-5 h-5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-white rounded flex items-center justify-center font-bold text-xs"
                    >
                      -
                    </button>
                    <span className="font-bold text-slate-200">{inventory.waterRations} L</span>
                    <button 
                      onClick={() => setInventory({ ...inventory, waterRations: inventory.waterRations + 1 })}
                      className="w-5 h-5 bg-slate-900 hover:bg-slate-800 border border-slate-850 text-white rounded flex items-center justify-center font-bold text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Priorities queue queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            
            {/* TABS: SOS Inbox / Incident Queue */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex gap-1">
                <button onClick={() => setActiveTab("sos")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === "sos" ? "bg-red-950 text-red-400 border-red-800" : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"
                  }`}>
                  🔔 SOS Inbox
                  {pendingSOSList.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">{pendingSOSList.length}</span>
                  )}
                </button>
                <button onClick={() => setActiveTab("queue")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    activeTab === "queue" ? "bg-blue-950 text-blue-400 border-blue-800" : "bg-transparent text-slate-500 border-transparent hover:text-slate-300"
                  }`}>
                  📋 Incident Queue
                </button>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-400">
                {activeTab === "sos" ? `${sosMessages.length} Total` : `${activeQueue.length} Active`}
              </span>
            </div>

            {/* === SOS INBOX TAB === */}
            {activeTab === "sos" && (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">

                {/* My Assigned Mission (pinned top) */}
                {myAssignedSOS && (
                  <div className="p-4 bg-orange-950/50 border border-orange-600 rounded-xl space-y-2 shadow-lg">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-extrabold bg-orange-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">🚒 MY ACTIVE MISSION</span>
                      <span className="text-[9px] font-mono text-orange-400">
                        {new Date(myAssignedSOS.timestamp).toLocaleTimeString().substring(0,5)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase">{myAssignedSOS.citizenName}</h4>
                      <p className="text-[10px] text-slate-400">{myAssignedSOS.address}</p>
                    </div>
                    <div className="flex gap-2 text-[9px] font-mono">
                      <span className={`px-2 py-0.5 rounded border font-bold uppercase ${
                        myAssignedSOS.disasterType === "flood" ? "bg-blue-950 text-blue-400 border-blue-900" :
                        myAssignedSOS.disasterType === "fire" ? "bg-red-950 text-red-400 border-red-900" :
                        myAssignedSOS.disasterType === "medical" ? "bg-emerald-950 text-emerald-400 border-emerald-900" :
                        "bg-amber-950 text-amber-400 border-amber-900"
                      }`}>{myAssignedSOS.disasterType}</span>
                      <span className="px-2 py-0.5 rounded border bg-slate-900 text-slate-400 border-slate-800 uppercase">{myAssignedSOS.severity}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">{myAssignedSOS.description}</p>
                    <div className="flex gap-2 pt-1">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${myAssignedSOS.lat},${myAssignedSOS.lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg text-center cursor-pointer">
                        🗺️ Get Directions
                      </a>
                      <button onClick={() => handleResolveSOS_inbox(myAssignedSOS.id)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg cursor-pointer">
                        ✅ Mark Rescued
                      </button>
                    </div>
                    <a href={`tel:${myAssignedSOS.phone}`}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-mono">
                      📞 {myAssignedSOS.phone}
                    </a>
                  </div>
                )}

                {/* Pending SOS Queue */}
                {pendingSOSList.length === 0 && !myAssignedSOS && (
                  <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No pending SOS alerts in queue. Stay on standby.
                  </div>
                )}

                {pendingSOSList.map((sos) => {
                  const disasterColors = {
                    flood: "border-blue-900/60 bg-blue-950/20",
                    fire: "border-red-900/60 bg-red-950/20",
                    earthquake: "border-amber-900/60 bg-amber-950/20",
                    medical: "border-emerald-900/60 bg-emerald-950/20",
                    other: "border-slate-800 bg-slate-950/20"
                  };
                  const disasterEmoji = { flood: "🌊", fire: "🔥", earthquake: "🏚️", medical: "🩺", other: "⚠️" };
                  const timeSince = Math.floor((Date.now() - sos.timestamp) / 60000);

                  return (
                    <div key={sos.id} className={`p-4 border rounded-xl space-y-2.5 transition-colors ${
                      sos.severity === "critical" ? "border-red-700 bg-red-950/30 shadow-lg" : disasterColors[sos.disasterType] || disasterColors.other
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-1.5">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                            sos.severity === "critical" ? "bg-red-700 text-white border-red-600" :
                            sos.severity === "high" ? "bg-orange-950 text-orange-400 border-orange-900" :
                            "bg-amber-950 text-amber-400 border-amber-900"
                          }`}>{sos.severity === "critical" ? "🚨 CRITICAL" : sos.severity.toUpperCase()}</span>
                          <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-slate-800 bg-slate-900 text-slate-400">
                            {disasterEmoji[sos.disasterType] || "⚠️"} {sos.disasterType}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">{timeSince}m ago</span>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-white">{sos.citizenName}</h4>
                        <p className="text-[10px] text-slate-400 leading-tight">{sos.address}</p>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-relaxed">{sos.description}</p>

                      {sos.imageBase64 && (
                        <div className="rounded-lg overflow-hidden border border-slate-800 max-h-[80px] flex bg-slate-900">
                          <img src={sos.imageBase64} alt="Citizen SOS evidence" className="object-cover w-full h-[80px]" />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-800/80 pt-2">
                        <span>📍 {sos.lat?.toFixed(4)}, {sos.lng?.toFixed(4)}</span>
                        <a href={`tel:${sos.phone}`} className="text-emerald-400 hover:text-emerald-300">📞 {sos.phone}</a>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleAcceptSOS_inbox(sos.id)}
                          disabled={!!myAssignedSOS}
                          className={`flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                            myAssignedSOS ? "opacity-40 cursor-not-allowed" : ""
                          }`}>
                          ✅ Accept & Respond
                        </button>
                        <button
                          onClick={() => handleDeclineSOS_inbox(sos.id)}
                          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold rounded-lg cursor-pointer">
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* === INCIDENT QUEUE TAB === */}
            {activeTab === "queue" && (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              
              {/* EMERGENCY SOS TICKET (Always pinned to absolute top) */}
              {activeSOS && activeSOS.status !== "resolved" && (
                <div className="p-4 bg-red-950/60 border border-red-500 hover:border-red-400 rounded-xl relative shadow-lg animate-pulse flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded tracking-widest uppercase">
                        CRITICAL DISTRESS SOS
                      </span>
                      <span className="text-[9px] font-mono text-red-400">{activeSOS.timestamp}</span>
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      GPS BEACON TRIGGERED
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-normal mt-1">
                      Citizen triggered distress radar tracker. Send emergency rescue team.
                    </p>
                    <div className="text-[9px] text-slate-400 font-mono mt-2">
                      GPS: {activeSOS.coords}
                    </div>
                  </div>

                  {assignedIncidentId === "sos-distress" ? (
                    <button
                      onClick={handleResolveSOS}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 touch-target"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.respArrived}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleAcceptSOS}
                      disabled={!!assignedIncidentId}
                      className={`w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 touch-target ${
                        assignedIncidentId ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{language === "hi" ? "एसओएस स्वीकारें" : "RESPOND TO SOS"}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Standard active incidents queue */}
              {activeQueue.map((inc) => {
                const isHigh = inc.severity === "high";
                const isCurrentlyAssigned = assignedIncidentId === inc.id;

                return (
                  <div
                    key={inc.id}
                    className={`p-3.5 border rounded-xl flex flex-col justify-between gap-3 transition-colors ${
                      isCurrentlyAssigned
                        ? "bg-slate-950 border-blue-500 shadow-md"
                        : isHigh 
                          ? "bg-slate-950/40 border-red-950 hover:border-red-900/60" 
                          : "bg-slate-950/20 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          isHigh ? "bg-red-950/60 text-red-400 border-red-900/40" : "bg-amber-950/60 text-amber-450 border-amber-900/40"
                        }`}>
                          {inc.severity.toUpperCase()} Priority
                        </span>
                        
                        <span className="text-[9px] text-slate-500 font-mono">{inc.coords}</span>
                      </div>

                      <h4 className="text-xs font-bold text-white uppercase tracking-wide leading-tight">
                        {inc.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-normal mt-1 select-text">
                        {inc.description}
                      </p>
                      {inc.photo && (
                        <div className="mt-2.5 rounded-lg overflow-hidden border border-slate-800 max-h-[100px] flex bg-slate-900">
                          <img src={inc.photo} alt="Incident evidence photo" className="object-cover w-full h-[100px]" />
                        </div>
                      )}
                    </div>

                    {isCurrentlyAssigned ? (
                      <button
                        onClick={handleResolveIncident}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 touch-target"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.respArrived}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAcceptDispatch(inc.id)}
                        disabled={!!assignedIncidentId}
                        className={`w-full py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 touch-target ${
                          assignedIncidentId ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        <Navigation className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t.respNavigate}</span>
                      </button>
                    )}
                  </div>
                );
              })}

              {activeQueue.length === 0 && (!activeSOS || activeSOS.status === "resolved") && (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  {language === "hi" ? "कोई सक्रिय बचाव कार्य नहीं है।" : "Queue empty. No active rescue incidents in range."}
                </div>
              )}
            </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
