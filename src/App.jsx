import React, { useState, useEffect, useRef } from "react";
import Onboarding from "./components/Onboarding";
import Header from "./components/Header";
import CitizenView from "./components/CitizenView";
import ResponderView from "./components/ResponderView";
import AdminView from "./components/AdminView";
import { fetchWithAuth } from "./utils/api";

export default function App() {
  // Global States
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [language, setLanguage] = useState("en"); // 'en' or 'hi'
  const [role, setRole] = useState("citizen"); // 'citizen', 'responder', 'admin'
  const [offline, setOffline] = useState(false); // Cellular Blackout simulator
  const [userLocation, setUserLocation] = useState(null); // { lat, lng }
  const [locationPermission, setLocationPermission] = useState("prompt"); // 'granted', 'denied', 'prompt'
  const [gpsAccuracy, setGpsAccuracy] = useState(null); // radius in meters
  const [locationError, setLocationError] = useState(null);

  // Global Simulated SOS State
  const [activeSOS, setActiveSOS] = useState(null);
  
  // Responder dispatch assignment state
  const [assignedIncidentId, setAssignedIncidentId] = useState(null);

  // Dynamic 20 nearby volunteers generator state
  const [nearbyVolunteers, setNearbyVolunteers] = useState([]);

  // ── GLOBAL SOS MESSAGE QUEUE ────────────────────────────────────────────────
  // Shared across Citizen (sender), Responder (receiver), Admin (monitor)
  // Persisted to localStorage so messages survive sign-out → sign-in role switches
  const SOS_SEED = [
    {
      id: "sos-seed-1",
      citizenName: "Priya Kapoor",
      phone: "+91 91234 56789",
      email: "priya.kapoor@gmail.com",
      lat: 28.6178, lng: 77.2068,
      address: "Block D, Sector 7, near Central Market",
      disasterType: "flood",
      severity: "critical",
      description: "Ground floor completely submerged. Family of 4 trapped on rooftop. Water rising. No boat access nearby.",
      imageBase64: null,
      timestamp: Date.now() - 1000 * 60 * 8,
      status: "dispatched",
      assignedResponderName: "Volunteer Squad Bravo"
    },
    {
      id: "sos-seed-2",
      citizenName: "Mohit Agarwal",
      phone: "+91 99876 54321",
      email: "mohit.agarwal@gmail.com",
      lat: 28.6092, lng: 77.2135,
      address: "Flat 302, Tower C, Lotus Heights",
      disasterType: "fire",
      severity: "high",
      description: "Kitchen gas line explosion. Fire spreading to adjacent flats on floor 3. Elevator non-functional.",
      imageBase64: null,
      timestamp: Date.now() - 1000 * 60 * 3,
      status: "pending",
      assignedResponderName: null
    },
    {
      id: "sos-seed-3",
      citizenName: "Sushma Devi",
      phone: "+91 98001 11223",
      email: "sushma.devi@gmail.com",
      lat: 28.6215, lng: 77.2202,
      address: "Village Palam, House 14, near Primary School",
      disasterType: "medical",
      severity: "high",
      description: "Elderly woman (78 yrs) unconscious, suspected heart attack. Nearest hospital 12km. Need ambulance urgently.",
      imageBase64: null,
      timestamp: Date.now() - 1000 * 60 * 25,
      status: "resolved",
      assignedResponderName: "Rescue Team Echo"
    }
  ];
  const [sosMessages, setSosMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("ar_sosMessages");
      return saved ? JSON.parse(saved) : SOS_SEED;
    } catch { return SOS_SEED; }
  });

  useEffect(() => {
    const center = userLocation || { lat: 31.1048, lng: 77.1734 };
    
    const names = [
      "Arjun Sharma", "Sunita Thakur", "Karan Katoch", "Deepak Bhardwaj", "Neha Verma",
      "Pooja Chandel", "Rohan Joshi", "Sanjay Parmar", "Preeti Singh", "Vijay Rana",
      "Anjali Sharma", "Manish Kanwar", "Aarav Gill", "Aditi Pathania", "Ravi Prashar",
      "Kavita Himachal", "Vikram Sen", "Ritu Roy", "Amit Dogra", "Jyoti Chohan"
    ];

    const capabilities = [
      { service: "Medical Assistance", supplies: "Trauma Medkit, Bandages, Burn Gel" },
      { service: "Emergency Food & Water Dispatch", supplies: "20L Water Cans, 15x MRE Rations" },
      { service: "4x4 Emergency Evacuation Transport", supplies: "Rescue Rope, Tow Hook, Winch" },
      { service: "Basic Search & Rescue / Clearings", supplies: "Chainsaw, Shovel, Heavy Gloves" },
      { service: "Civil Engineering & Safety Audit", supplies: "Hardhat, Structural Stress Sensors" },
      { service: "Shortwave Amateur Ham Radio Hookup", supplies: "Portable VHF Transceiver, Solar Charger" },
      { service: "Temporary Community Shelter Host", supplies: "5x Extra Sleeping Cots, Blankets" }
    ];

    const generated = names.map((name, i) => {
      const offsetLat = ((i % 5) - 2) * 0.008;
      const offsetLng = (Math.floor(i / 5) - 2) * 0.008;
      const lat = center.lat + offsetLat;
      const lng = center.lng + offsetLng;
      
      const cap = capabilities[i % capabilities.length];
      
      return {
        id: `vol-hp-${i + 1}`,
        name,
        phone: `+91 98160 ${10000 + i * 432}`,
        lat,
        lng,
        coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        service: cap.service,
        supplies: cap.supplies
      };
    });

    setNearbyVolunteers(generated);
  }, [userLocation]);

  // Ref to hold the active watchPosition ID so we can clear it
  const watchIdRef = useRef(null);

  // Shared success/error handlers for geolocation
  const handlePositionSuccess = (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    setUserLocation({ lat, lng });
    setGpsAccuracy(position.coords.accuracy);
    setLocationPermission("granted");
    setLocationError(null);

    // Keep the self-responder marker in sync with the live position
    setResponders(prev =>
      prev.map(r => r.id === "resp-self" ? { ...r, lat, lng, coords: `${lat.toFixed(4)}, ${lng.toFixed(4)}` } : r)
    );
  };

  const handlePositionError = (error) => {
    console.warn("Geolocation denied or unavailable:", error.message);
    setLocationPermission("denied");
    setLocationError(error.message);
  };

  // Function to manually request or refresh GPS access
  const requestGpsAccess = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    // Clear any existing watcher before starting a new one
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  // Start live GPS tracking on mount, clean up on unmount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    // Listen for permission state changes
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state);
        result.onchange = () => {
          setLocationPermission(result.state);
          // If user grants permission after being denied, restart the watcher
          if (result.state === "granted") {
            requestGpsAccess();
          }
        };
      }).catch(() => {
        // permissions.query not supported; ignore
      });
    }

    // Start continuous live tracking via watchPosition
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    // Cleanup: stop tracking when the app unmounts
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global Incidents DB
  // Persisted to localStorage so citizen-reported incidents survive sign-out → sign-in
  const INCIDENTS_SEED = [
    {
      id: 1,
      category: "flood",
      title: "Submerged Road & Vehicles - Block B Underpass",
      description: "Waterlogging exceeds 1.5 meters. Two vehicles stuck with occupants inside. Need immediate evacuation boat squad.",
      severity: "high",
      status: "pending",
      x: 320,
      y: 190,
      coords: "28.6145, 77.2081",
      lat: 28.6145,
      lng: 77.2081
    },
    {
      id: 2,
      category: "fire",
      title: "Electrical Transformer Fire - Sector 5 Market",
      description: "Transformer fire spreading rapidly to adjacent shops. Dense toxic smoke. Fire brigade dispatched.",
      severity: "high",
      status: "in-progress",
      x: 580,
      y: 280,
      coords: "28.6190, 77.2155",
      lat: 28.6190,
      lng: 77.2155
    },
    {
      id: 3,
      category: "medical",
      title: "Injured Citizen Evacuation - Block G",
      description: "Elderly resident requires medical transport, suspected fracture and chest discomfort. Clear route requested.",
      severity: "medium",
      status: "pending",
      x: 480,
      y: 120,
      coords: "28.6095, 77.2201",
      lat: 28.6095,
      lng: 77.2201
    }
  ];
  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = localStorage.getItem("ar_incidents");
      return saved ? JSON.parse(saved) : INCIDENTS_SEED;
    } catch { return INCIDENTS_SEED; }
  });

  // Persist incidents & sosMessages to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem("ar_incidents", JSON.stringify(incidents)); } catch {}
  }, [incidents]);

  useEffect(() => {
    try { localStorage.setItem("ar_sosMessages", JSON.stringify(sosMessages)); } catch {}
  }, [sosMessages]);

  // Global Responders DB
  const [responders, setResponders] = useState([
    {
      id: "resp-self", // The active user responder
      name: "Unit 4 Rescue Team (You)",
      status: "available",
      type: "Ambulance Crew",
      x: 200,
      y: 320,
      coords: "28.6110, 77.2012",
      lat: 28.6110,
      lng: 77.2012
    },
    {
      id: 2,
      name: "Volunteer Squad Bravo",
      status: "busy",
      type: "Boat Evacuation",
      x: 500,
      y: 100,
      coords: "28.6250, 77.2245",
      lat: 28.6250,
      lng: 77.2245
    },
    {
      id: 3,
      name: "Rescue Team Echo",
      status: "available",
      type: "Search & Rescue",
      x: 680,
      y: 240,
      coords: "28.6015, 77.2340",
      lat: 28.6015,
      lng: 77.2340
    }
  ]);

  // Global Relief Camps DB
  const [camps, setCamps] = useState([
    {
      id: 1,
      name: "Central Sports Stadium Relief Base",
      beds: 250,
      bedsOccupied: 180,
      foodRations: 65,
      waterSupply: 78,
      x: 300,
      y: 180,
      lat: 28.6120,
      lng: 77.2100
    },
    {
      id: 2,
      name: "North Hill High-School Safe Camp",
      beds: 120,
      bedsOccupied: 110,
      foodRations: 24, // low stock trigger
      waterSupply: 28, // low stock trigger
      x: 620,
      y: 90,
      lat: 28.6280,
      lng: 77.1950
    },
    {
      id: 3,
      name: "Metro Hub Sheltered Safe Haven",
      beds: 150,
      bedsOccupied: 45,
      foodRations: 92,
      waterSupply: 88,
      x: 450,
      y: 350,
      lat: 28.6020,
      lng: 77.2150
    }
  ]);

  // Global Emergency Broadcast Alerts list
  const [broadcastAlerts, setBroadcastAlerts] = useState([
    "RED WEATHER ADVISORY: Torrential rainfall expected for next 12 hours. Sector 4 residents prepare for voluntary evacuation.",
    "CIVILIAN HEALTH NOTICE: Drinking water utility shut down in Block A. Bottle rations distributed at Camp 1."
  ]);

  // Global Family Circle Statuses
  const [familyMembers, setFamilyMembers] = useState([
    { id: 1, name: "Self (You)", relation: "Self", status: "safe", time: "16:40" },
    { id: 2, name: "Ramesh Sharma", relation: "Father", status: "safe", time: "16:25", lat: 28.6152, lng: 77.2031 },
    { id: 3, name: "Geeta Sharma", relation: "Mother", status: "danger", time: "16:32", lat: 28.6085, lng: 77.2185 }
  ]);

  // Global Volunteer Registry
  const [volunteers, setVolunteers] = useState([
    {
      id: 1,
      name: "Vikram Singh",
      license: "EMT-99432",
      roleDesc: "Licensed Paramedic, Trauma Response Team",
      verified: false
    },
    {
      id: 2,
      name: "Sarah Collins",
      license: "VOL-00219",
      roleDesc: "Disaster Shelter Organizer, Local NGO Coordinator",
      verified: true
    },
    {
      id: 3,
      name: "Amit Khanna",
      license: "SAR-10482",
      roleDesc: "Search & Rescue K9 Handler, Disaster Response Corp",
      verified: false
    }
  ]);

  // Handle active SOS dispatch trigger
  useEffect(() => {
    if (activeSOS && activeSOS.status === "active") {
      // Find active user responder and auto-route them to citizen SOS coordinates
      const timer = setTimeout(() => {
        setResponders(prev => 
          prev.map(r => r.id === "resp-self" || r.id === 1 ? { ...r, status: "busy" } : r)
        );
        setActiveSOS(prev => ({ ...prev, status: "dispatched" }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [activeSOS]);

  // Dynamic Hindi labels translations helper for family relations
  useEffect(() => {
    if (language === "hi") {
      setFamilyMembers(prev => 
        prev.map(m => {
          if (m.relation === "Self" || m.relation === "स्वयं") return { ...m, name: "स्वयं (You)", relation: "स्वयं" };
          if (m.relation === "Father" || m.relation === "पिता") return { ...m, name: "रमेश शर्मा", relation: "पिता", lat: 28.6152, lng: 77.2031 };
          if (m.relation === "Mother" || m.relation === "माता") return { ...m, name: "गीता शर्मा", relation: "माता", lat: 28.6085, lng: 77.2185 };
          return m;
        })
      );
    } else {
      setFamilyMembers([
        { id: 1, name: "Self (You)", relation: "Self", status: "safe", time: "16:40" },
        { id: 2, name: "Ramesh Sharma", relation: "Father", status: "safe", time: "16:25", lat: 28.6152, lng: 77.2031 },
        { id: 3, name: "Geeta Sharma", relation: "Mother", status: "danger", time: "16:32", lat: 28.6085, lng: 77.2185 }
      ]);
    }
  }, [language]);

  // Offline mode simulator side-effects
  useEffect(() => {
    if (offline) {
      // Add system broadcast message to inform offline mode is running
      const msg = language === "hi" 
        ? "सिस्टम: ऑफलाइन ब्लैकआउट सिम्युलेटर सक्रिय। इंटरनेट विफलता के दौरान गाइडबुक पूरी तरह चालू है।" 
        : "SYSTEM: Cellular blackout simulation is active. Cached files, offline map vectors remain active.";
      
      setBroadcastAlerts(prev => [msg, ...prev]);
    } else {
      // Clear offline system messages on restore
      setBroadcastAlerts(prev => prev.filter(alert => !alert.includes("blackout") && !alert.includes("ब्लैकआउट")));
    }
  }, [offline]);

  // Authenticated user profile (Gmail verification)
  const [userProfile, setUserProfile] = useState(null);

  // Fetch live backend data when online and authenticated (with 8s live background polling)
  useEffect(() => {
    if (offline || !onboardingComplete) return;

    const fetchDashboardData = async () => {
      try {
        const incidentsRes = await fetchWithAuth("/api/dashboard/incidents");
        if (incidentsRes.success && incidentsRes.data) setIncidents(incidentsRes.data);

        const campsRes = await fetchWithAuth("/api/dashboard/camps");
        if (campsRes.success && campsRes.data) setCamps(campsRes.data);

        const respondersRes = await fetchWithAuth("/api/dashboard/responders");
        if (respondersRes.success && respondersRes.data) setResponders(respondersRes.data);

        const sosRes = await fetchWithAuth("/api/dashboard/sos");
        if (sosRes.success && sosRes.data) setSosMessages(sosRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 8000);
    return () => clearInterval(interval);
  }, [offline, onboardingComplete]);

  // Render Onboarding flow if not complete
  if (!onboardingComplete) {
    return (
      <Onboarding
        language={language}
        setLanguage={setLanguage}
        setRole={setRole}
        setUserProfile={setUserProfile}
        onComplete={() => setOnboardingComplete(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Accessible Navigation Header */}
      <Header
        language={language}
        setLanguage={setLanguage}
        role={role}
        offline={offline}
        setOffline={setOffline}
        userProfile={userProfile}
        onSignOut={() => {
          setUserProfile(null);
          setOnboardingComplete(false);
        }}
      />

      {/* Role-based dashboard router */}
      <main className="flex-1">
        {role === "citizen" && (
          <CitizenView
            language={language}
            offline={offline}
            incidents={incidents}
            setIncidents={setIncidents}
            activeSOS={activeSOS}
            setActiveSOS={setActiveSOS}
            responders={responders}
            camps={camps}
            familyMembers={familyMembers}
            setFamilyMembers={setFamilyMembers}
            broadcastAlerts={broadcastAlerts}
            userLocation={userLocation}
            locationPermission={locationPermission}
            gpsAccuracy={gpsAccuracy}
            locationError={locationError}
            requestGpsAccess={requestGpsAccess}
            nearbyVolunteers={nearbyVolunteers}
            sosMessages={sosMessages}
            setSosMessages={setSosMessages}
          />
        )}

        {role === "responder" && (
          <ResponderView
            language={language}
            offline={offline}
            incidents={incidents}
            setIncidents={setIncidents}
            activeSOS={activeSOS}
            setActiveSOS={setActiveSOS}
            responders={responders}
            setResponders={setResponders}
            camps={camps}
            assignedIncidentId={assignedIncidentId}
            setAssignedIncidentId={setAssignedIncidentId}
            userLocation={userLocation}
            locationPermission={locationPermission}
            gpsAccuracy={gpsAccuracy}
            locationError={locationError}
            requestGpsAccess={requestGpsAccess}
            nearbyVolunteers={nearbyVolunteers}
            sosMessages={sosMessages}
            setSosMessages={setSosMessages}
            userProfile={userProfile}
          />
        )}

        {role === "admin" && (
          <AdminView
            language={language}
            offline={offline}
            incidents={incidents}
            responders={responders}
            camps={camps}
            setCamps={setCamps}
            broadcastAlerts={broadcastAlerts}
            setBroadcastAlerts={setBroadcastAlerts}
            activeSOS={activeSOS}
            volunteers={volunteers}
            setVolunteers={setVolunteers}
            userLocation={userLocation}
            locationPermission={locationPermission}
            gpsAccuracy={gpsAccuracy}
            locationError={locationError}
            requestGpsAccess={requestGpsAccess}
            nearbyVolunteers={nearbyVolunteers}
            sosMessages={sosMessages}
            setSosMessages={setSosMessages}
            setResponders={setResponders}
          />
        )}
      </main>

      {/* Technical Footer HUD bar */}
      <footer className="bg-slate-50 dark:bg-slate-950 py-3 px-4 md:px-8 border-t border-slate-300 dark:border-slate-900 text-center text-[10px] text-slate-500 dark:text-slate-500 font-mono flex flex-col md:flex-row justify-between items-center gap-2">
        <span>© 2026 Aapada Rakshak Command Desk. All Rights Reserved.</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            GPS Lock: ACTIVE
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${offline ? "bg-red-500" : "bg-emerald-400"}`}></span>
            Sync status: {offline ? "OFFLINE BUFFERING" : "LIVE LINK"}
          </span>
        </div>
      </footer>
    </div>
  );
}
